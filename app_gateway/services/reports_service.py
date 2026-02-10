"""
Device Reports Generation Service - PyEZ Integration

This module handles the generation of device reports using PyEZ (junos-eznc)
for real device connections and command execution on Juniper EX, MX, and SRX platforms.
"""

import asyncio
import sys
import json
from datetime import datetime
from typing import List, Dict, Any
from loguru import logger

# Import configuration
from ..core.config import settings
from .websocket import publish_to_redis

# Add the reports_generator to path
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../frontend/reports_generator'))

# Import the report generator
try:
    from report_generator import DeviceReportGenerator
    REPORT_GENERATOR_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Report generator module not available: {e}")
    REPORT_GENERATOR_AVAILABLE = False

# Redis configuration
REDIS_HOST = settings.REDIS_HOST
REDIS_PORT = int(settings.REDIS_PORT)


async def execute_report_generation(
    job_id: str,
    hostname: str,
    username: str,
    password: str,
    report_types: List[str]
):
    """
    Execute report generation for a device using the modular report generator.

    This function:
    1. Validates report types
    2. Connects to the device using PyEZ
    3. Executes RPC commands for each report type
    4. Parses and structures the output
    5. Publishes progress via WebSocket
    6. Returns final results

    Args:
        job_id: Unique job identifier
        hostname: Target device hostname or IP
        username: Device username
        password: Device password
        report_types: List of report type IDs to generate
    """
    ws_channel = f"ws_channel:job:{job_id}"
    start_time = datetime.now()
    total_reports = len(report_types)

    logger.info(f"Starting report generation job {job_id} for {hostname}")
    logger.info(f"Report types to generate: {report_types}")

    try:
        # Check if report generator is available
        if not REPORT_GENERATOR_AVAILABLE:
            raise Exception("Report generator module not available. Please ensure the module is properly installed.")

        # Step 1: Initializing
        await publish_status_update(
            ws_channel,
            {
                "event_type": "status",
                "job_id": job_id,
                "data": {
                    "step": "initializing",
                    "message": f"Initializing report generator for {hostname}...",
                    "progress": 5
                }
            }
        )

        generator = DeviceReportGenerator()

        # Validate report types
        is_valid, invalid = generator.validate_report_types(report_types)
        if not is_valid:
            raise Exception(f"Invalid report types: {invalid}")

        # Step 2: Connecting to device
        await publish_status_update(
            ws_channel,
            {
                "event_type": "status",
                "job_id": job_id,
                "data": {
                    "step": "connecting",
                    "message": f"Connecting to device {hostname} using PyEZ...",
                    "progress": 10
                }
            }
        )

        # Run the synchronous device connection in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: asyncio.run(generator.generate_reports_for_device(
                hostname=hostname,
                username=username,
                password=password,
                report_types=report_types
            ))
        )

        # Step 3: Process results
        await publish_status_update(
            ws_channel,
            {
                "event_type": "status",
                "job_id": job_id,
                "data": {
                    "step": "processing",
                    "message": "Processing report results...",
                    "progress": 80
                }
            }
        )

        # Calculate duration
        duration = (datetime.now() - start_time).total_seconds()

        # Compile final results
        final_results = {
            "job_id": job_id,
            "hostname": hostname,
            "device_info": result.get("device_info", {}),
            "reports": result.get("reports", {}),
            "summary": {
                "total": result.get("total_reports", total_reports),
                "successful": result.get("successful", 0),
                "failed": result.get("failed", 0),
                "duration": round(duration, 2)
            },
            "timestamp": datetime.now().isoformat()
        }

        await publish_status_update(
            ws_channel,
            {
                "event_type": "REPORT_COMPLETE",
                "job_id": job_id,
                "data": final_results
            }
        )

        # Mark job as finished
        await publish_status_update(
            ws_channel,
            {
                "event_type": "status",
                "job_id": job_id,
                "status": "finished",
                "data": {
                    "step": "complete",
                    "message": f"Report generation complete. Generated {final_results['summary']['successful']} of {total_reports} reports.",
                    "progress": 100
                }
            }
        )

        logger.info(f"Report generation job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Error in report generation job {job_id}: {e}")

        # Publish error
        await publish_status_update(
            ws_channel,
            {
                "event_type": "error",
                "job_id": job_id,
                "data": {
                    "step": "error",
                    "message": f"Report generation failed: {str(e)}",
                    "error": str(e)
                }
            }
        )


async def publish_status_update(ws_channel: str, message: Dict[str, Any]):
    """
    Publish a status update to Redis WebSocket channel.

    Args:
        ws_channel: WebSocket channel name (e.g., "ws_channel:job:UUID")
        message: Message dictionary to publish
    """
    try:
        success = await publish_to_redis(ws_channel, message)
        if success:
            logger.debug(f"Published status update to {ws_channel}")
        else:
            logger.warning(f"Failed to publish status update to {ws_channel}")
    except Exception as e:
        logger.error(f"Error publishing status update: {e}")
