"""
Reports Router
Defines all HTTP endpoints related to device report generation.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from loguru import logger

router = APIRouter(prefix="/reports", tags=["Device Reports"])


class ReportRequest(BaseModel):
    """Request model for report generation."""
    hostname: str
    username: str
    password: str
    report_types: List[str]
    inventory_file: Optional[str] = None


class ReportTypeResponse(BaseModel):
    """Response model for report type information."""
    id: str
    name: str
    description: str
    category: str
    command: str
    timeout: int


# Available report types definition
REPORT_TYPES = [
    {
        "id": "device_os",
        "name": "Device OS",
        "description": "Operating system version and hardware information",
        "category": "System",
        "command": "show version",
        "timeout": 30
    },
    {
        "id": "interfaces",
        "name": "Interfaces",
        "description": "Interface status and configuration summary",
        "category": "Interfaces",
        "command": "show interfaces",
        "timeout": 45
    },
    {
        "id": "interfaces_stats",
        "name": "Interface Statistics",
        "description": "Detailed interface statistics and error counters",
        "category": "Interfaces",
        "command": "show interfaces extensive",
        "timeout": 60
    },
    {
        "id": "ospf",
        "name": "OSPF",
        "description": "OSPF protocol status and neighbor information",
        "category": "Protocols",
        "command": "show ospf neighbor",
        "timeout": 30
    },
    {
        "id": "bgp",
        "name": "BGP",
        "description": "BGP protocol status and peer information",
        "category": "Protocols",
        "command": "show bgp summary",
        "timeout": 30
    },
    {
        "id": "routes",
        "name": "Routes",
        "description": "Routing table information",
        "category": "Protocols",
        "command": "show route",
        "timeout": 45
    },
    {
        "id": "ldp",
        "name": "LDP",
        "description": "LDP label distribution sessions",
        "category": "MPLS",
        "command": "show ldp session",
        "timeout": 30
    },
    {
        "id": "mpls",
        "name": "MPLS LSPs",
        "description": "MPLS label-switched path status",
        "category": "MPLS",
        "command": "show mpls lsp",
        "timeout": 30
    },
    {
        "id": "rsvp",
        "name": "RSVP",
        "description": "RSVP signaling sessions",
        "category": "MPLS",
        "command": "show rsvp session",
        "timeout": 30
    },
]


@router.get("/types")
async def get_report_types():
    """
    Get all available report types.

    Returns a list of all report types that can be generated,
    including their metadata and required commands.
    """
    logger.info("Fetching available report types")
    return {
        "status": "success",
        "total": len(REPORT_TYPES),
        "report_types": REPORT_TYPES
    }


@router.post("/generate")
async def generate_reports(req: ReportRequest, background_tasks: BackgroundTasks):
    """
    Generate device reports for specified report types.

    This endpoint queues a background job to:
    1. Connect to the specified device
    2. Execute commands for each selected report type
    3. Parse and structure the output
    4. Return comprehensive device reports

    Args:
        req: Report generation request with hostname, credentials, and report types
        background_tasks: FastAPI BackgroundTasks for async execution

    Returns:
        job_id: UUID for tracking the job
        ws_channel: WebSocket channel for real-time updates
        status: Initial job status
    """
    job_id = str(uuid.uuid4())

    logger.info(f"Received report generation request for job {job_id}")
    logger.info(f"Target device: {req.hostname}")
    logger.info(f"Report types: {req.report_types}")

    # Validate report types
    valid_report_ids = {rt["id"] for rt in REPORT_TYPES}
    invalid_types = [rt for rt in req.report_types if rt not in valid_report_ids]

    if invalid_types:
        logger.warning(f"Invalid report types requested: {invalid_types}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report types: {invalid_types}. Valid types are: {list(valid_report_ids)}"
        )

    if not req.report_types:
        logger.warning("No report types specified")
        raise HTTPException(
            status_code=400,
            detail="At least one report type must be specified"
        )

    # Import here to avoid circular dependencies
    try:
        from app_gateway.services.reports_service import execute_report_generation

        # Queue the background task
        async def run_report_job():
            await execute_report_generation(
                job_id=job_id,
                hostname=req.hostname,
                username=req.username,
                password=req.password,
                report_types=req.report_types
            )

        background_tasks.add_task(run_report_job)

    except ImportError as e:
        logger.error(f"Failed to import reports service: {e}")
        raise HTTPException(
            status_code=500,
            detail="Report generation service not available. Please ensure the service is properly configured."
        )

    return {
        "job_id": job_id,
        "ws_channel": f"job:{job_id}",
        "status": "queued",
        "message": f"Report generation started for {len(req.report_types)} report types",
        "total_reports": len(req.report_types)
    }


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """
    Get the status of a report generation job.

    Args:
        job_id: UUID of the job to check

    Returns:
        Job status information including completion percentage and results if available
    """
    logger.info(f"Fetching status for job {job_id}")

    # TODO: Implement job status retrieval from Redis or database
    # For now, return a placeholder response
    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Job status tracking not yet implemented",
        "progress": 0
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint for the reports service.
    """
    return {
        "status": "healthy",
        "service": "Device Reports Generator",
        "version": "1.0.0",
        "available_reports": len(REPORT_TYPES)
    }
