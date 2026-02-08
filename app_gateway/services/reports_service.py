"""
Device Reports Generation Service - PyEZ Integration

This module handles the generation of device reports using PyEZ (junos-eznc)
for real device connections and command execution on Juniper EX, MX, and SRX platforms.
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from loguru import logger
import xml.etree.ElementTree as ET

# Import PyEZ
from jnpr.junos import Device
from jnpr.junos.exception import ConnectError, ConfigLoadError, RpcError

# Import configuration
from ..core.config import settings
from .websocket import publish_to_redis

# Redis configuration
REDIS_HOST = settings.REDIS_HOST
REDIS_PORT = int(settings.REDIS_PORT)

# Report type definitions with PyEZ RPC mappings
REPORT_TYPES = {
    "device_os": {
        "id": "device_os",
        "name": "Device OS",
        "rpc": "get-software-information",
        "timeout": 30
    },
    "interfaces": {
        "id": "interfaces",
        "name": "Interfaces",
        "rpc": "get-interface-information",
        "timeout": 45
    },
    "interfaces_stats": {
        "id": "interfaces_stats",
        "name": "Interface Statistics",
        "rpc": "get-interface-information",
        "rpc_args": {"extensive": True},
        "timeout": 60
    },
    "ospf": {
        "id": "ospf",
        "name": "OSPF",
        "rpc": "get-ospf-neighbor-information",
        "timeout": 30
    },
    "bgp": {
        "id": "bgp",
        "name": "BGP",
        "rpc": "get-bgp-summary-information",
        "timeout": 30
    },
    "routes": {
        "id": "routes",
        "name": "Routes",
        "rpc": "get-route-information",
        "timeout": 45
    },
    "ldp": {
        "id": "ldp",
        "name": "LDP",
        "rpc": "get-ldp-session-information",
        "timeout": 30
    },
    "mpls": {
        "id": "mpls",
        "name": "MPLS LSPs",
        "rpc": "get-mpls-lsp-information",
        "timeout": 30
    },
    "rsvp": {
        "id": "rsvp",
        "name": "RSVP",
        "rpc": "get-rsvp-session-information",
        "timeout": 30
    },
}


async def execute_report_generation(
    job_id: str,
    hostname: str,
    username: str,
    password: str,
    report_types: List[str]
):
    """
    Execute report generation for a device using PyEZ.

    This function:
    1. Connects to the device using PyEZ
    2. Executes RPC commands for each report type
    3. Parses and structures the XML output
    4. Publishes progress via WebSocket
    5. Returns final results

    Args:
        job_id: Unique job identifier
        hostname: Target device hostname or IP
        username: Device username
        password: Device password
        report_types: List of report type IDs to generate
    """
    ws_channel = f"ws_channel:job:{job_id}"
    start_time = datetime.now()
    results = {}
    total_reports = len(report_types)

    logger.info(f"Starting PyEZ report generation job {job_id} for {hostname}")
    logger.info(f"Report types to generate: {report_types}")

    dev = None

    try:
        # Step 1: Connecting to device
        await publish_status_update(
            ws_channel,
            {
                "event_type": "status",
                "job_id": job_id,
                "data": {
                    "step": "connecting",
                    "message": f"Connecting to device {hostname} using PyEZ...",
                    "progress": 5
                }
            }
        )

        # Create PyEZ Device connection (run in thread pool to avoid blocking)
        dev = Device(host=hostname, user=username, password=password, gather_facts=False)

        # Open connection in thread pool
        try:
            await asyncio.to_thread(dev.open)
            logger.info(f"Successfully connected to {hostname} using PyEZ")

            # Get device facts
            facts = await asyncio.to_thread(lambda: dev.facts)

            await publish_status_update(
                ws_channel,
                {
                    "event_type": "status",
                    "job_id": job_id,
                    "data": {
                        "step": "connected",
                        "message": f"Successfully connected to {hostname} ({facts.get('model', 'Unknown')} - {facts.get('version', 'Unknown')})",
                        "progress": 10,
                        "device_info": {
                            "model": facts.get('model', 'Unknown'),
                            "version": facts.get('version', 'Unknown'),
                            "serial": facts.get('serialnumber', 'Unknown'),
                            "hostname": facts.get('hostname', hostname)
                        }
                    }
                }
            )

        except ConnectError as e:
            logger.error(f"PyEZ connection error to {hostname}: {e}")
            raise Exception(f"Failed to connect to device: {str(e)}")

        # Step 2: Generate reports for each type
        for index, report_type_id in enumerate(report_types):
            if report_type_id not in REPORT_TYPES:
                logger.warning(f"Unknown report type: {report_type_id}")
                results[report_type_id] = {
                    "status": "error",
                    "error": f"Unknown report type: {report_type_id}",
                    "timestamp": datetime.now().isoformat()
                }
                continue

            report_config = REPORT_TYPES[report_type_id]
            progress = 10 + ((index + 1) * 70 // total_reports)

            await publish_status_update(
                ws_channel,
                {
                    "event_type": "status",
                    "job_id": job_id,
                    "data": {
                        "step": "generating_report",
                        "message": f"Generating {report_config['name']} report...",
                        "report_type": report_type_id,
                        "progress": progress
                    }
                }
            )

            try:
                # Execute RPC call
                logger.info(f"Executing RPC: {report_config['rpc']} on {hostname}")

                # Get RPC args if any
                rpc_args = report_config.get('rpc_args', {})

                # Execute RPC in thread pool
                rpc_response = await asyncio.to_thread(
                    lambda: dev.rpc(report_config['rpc'], **rpc_args, normalize=True)
                )

                # Convert XML response to structured data
                report_data = parse_rpc_response(rpc_response, report_type_id)

                # Store result
                results[report_type_id] = {
                    "status": "success",
                    "name": report_config['name'],
                    "description": REPORT_TYPES.get(report_type_id, {}).get('description', ''),
                    "rpc": report_config['rpc'],
                    "data": report_data,
                    "timestamp": datetime.now().isoformat()
                }

                await publish_status_update(
                    ws_channel,
                    {
                        "event_type": "REPORT_COMPLETE",
                        "job_id": job_id,
                        "data": {
                            "report_type": report_type_id,
                            "report_name": report_config['name'],
                            "status": "success",
                            "progress": progress
                        }
                    }
                )

                logger.info(f"Successfully generated {report_type_id} report for {hostname}")

            except RpcError as e:
                logger.error(f"RPC error for {report_type_id}: {e}")
                results[report_type_id] = {
                    "status": "error",
                    "error": f"RPC Error: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                }

            except Exception as e:
                logger.error(f"Error generating {report_type_id} report: {e}")
                results[report_type_id] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }

        # Step 3: Finalize and return results
        duration = (datetime.now() - start_time).total_seconds()

        await publish_status_update(
            ws_channel,
            {
                "event_type": "status",
                "job_id": job_id,
                "data": {
                    "step": "finalizing",
                    "message": "Finalizing report generation...",
                    "progress": 90
                }
            }
        )

        # Compile final results
        final_results = {
            "job_id": job_id,
            "hostname": hostname,
            "device_info": {
                "model": dev.facts.get('model', 'Unknown'),
                "version": dev.facts.get('version', 'Unknown'),
                "serial": dev.facts.get('serialnumber', 'Unknown'),
                "hostname": dev.facts.get('hostname', hostname)
            },
            "reports": results,
            "summary": {
                "total": total_reports,
                "successful": sum(1 for r in results.values() if r["status"] == "success"),
                "failed": sum(1 for r in results.values() if r["status"] == "error"),
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

    finally:
        # Close device connection
        if dev:
            try:
                await asyncio.to_thread(dev.close)
                logger.info(f"Closed PyEZ connection to {hostname}")
            except Exception as e:
                logger.error(f"Error closing device connection: {e}")


def parse_rpc_response(rpc_response, report_type: str) -> Dict[str, Any]:
    """
    Parse PyEZ RPC XML response into structured data.

    Args:
        rpc_response: XML response from PyEZ RPC call
        report_type: Type of report being parsed

    Returns:
        Structured dictionary with parsed data
    """
    try:
        # Convert lxml Element to string and parse
        xml_str = ET.tostring(rpc_response, encoding='unicode')
        root = ET.fromstring(xml_str)

        # Parse based on report type
        if report_type == "device_os":
            return parse_device_os(root)
        elif report_type == "interfaces" or report_type == "interfaces_stats":
            return parse_interfaces(root)
        elif report_type == "ospf":
            return parse_ospf(root)
        elif report_type == "bgp":
            return parse_bgp(root)
        elif report_type == "routes":
            return parse_routes(root)
        elif report_type == "ldp":
            return parse_ldp(root)
        elif report_type == "mpls":
            return parse_mpls(root)
        elif report_type == "rsvp":
            return parse_rsvp(root)
        else:
            # Default: return raw XML
            return {
                "raw_xml": xml_str,
                "format": "xml"
            }

    except Exception as e:
        logger.error(f"Error parsing RPC response for {report_type}: {e}")
        return {
            "error": f"Failed to parse response: {str(e)}",
            "raw_data": str(rpc_response)
        }


def parse_device_os(root) -> Dict[str, Any]:
    """Parse device OS information."""
    try:
        # Extract software information
        software_information = {}

        # Helper to find text
        def find_text(parent, tag):
            elem = parent.find(tag)
            return elem.text if elem is not None else None

        software_information["hostname"] = find_text(root, "host-name")
        software_information["model"] = find_text(root, "product-model")
        software_information["version"] = find_text(root, "junos-version")
        software_information["serial_number"] = find_text(root, "serial-number")

        return {
            "software_information": software_information,
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing device OS: {e}")
        return {"error": str(e)}


def parse_interfaces(root) -> Dict[str, Any]:
    """Parse interface information."""
    try:
        interfaces = []

        # Find all physical-interface and logical-interface elements
        for interface in root.findall(".//physical-interface"):
            name = interface.find("name")
            if name is not None and name.text:
                interface_data = {
                    "name": name.text,
                    "admin_status": interface.findtext("admin-status"),
                    "oper_status": interface.findtext("oper-status"),
                    "description": interface.findtext("description"),
                    "mtu": interface.findtext("mtu"),
                    "speed": interface.findtext("speed"),
                    "mac_address": interface.findtext("mac-address")
                }

                # Add logical interfaces if present
                logical_interfaces = []
                for logical in interface.findall(".//logical-interface"):
                    logical_name = logical.find("name")
                    if logical_name is not None:
                        logical_interfaces.append({
                            "name": logical_name.text,
                            "description": logical.findtext("description")
                        })

                if logical_interfaces:
                    interface_data["logical_interfaces"] = logical_interfaces

                interfaces.append(interface_data)

        return {
            "interfaces": interfaces,
            "total_count": len(interfaces),
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing interfaces: {e}")
        return {"error": str(e)}


def parse_ospf(root) -> Dict[str, Any]:
    """Parse OSPF neighbor information."""
    try:
        neighbors = []

        for neighbor in root.findall(".//ospf-neighbor"):
            neighbor_data = {
                "neighbor_id": neighbor.findtext("neighbor-id"),
                "interface": neighbor.findtext("interface-name"),
                "state": neighbor.findtext("ospf-neighbor-state"),
                "priority": neighbor.findtext("neighbor-priority"),
                "dead_time": neighbor.findtext("neighbor-dead-time")
            }
            neighbors.append(neighbor_data)

        return {
            "ospf_neighbors": neighbors,
            "total_count": len(neighbors),
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing OSPF: {e}")
        return {"error": str(e)}


def parse_bgp(root) -> Dict[str, Any]:
    """Parse BGP summary information."""
    try:
        peers = []

        for peer in root.findall(".//bgp-peer"):
            peer_data = {
                "peer_address": peer.findtext("peer-address"),
                "peer_as": peer.findtext("peer-as"),
                "state": peer.findtext("peer-state"),
                "flaps": peer.findtext("flap-count"),
                "uptime": peer.findtext("elapsed-time")
            }
            peers.append(peer_data)

        return {
            "bgp_peers": peers,
            "total_count": len(peers),
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing BGP: {e}")
        return {"error": str(e)}


def parse_routes(root) -> Dict[str, Any]:
    """Parse routing table information."""
    try:
        routes = []

        for route in root.findall(".//route"):
            route_data = {
                "destination": route.findtext("destination-destination"),
                "protocol": route.findtext("protocol-name"),
                "age": route.findtext("age"),
                "next_hop": route.findtext("next-hop")
            }
            routes.append(route_data)

        return {
            "routes": routes,
            "total_count": len(routes),
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing routes: {e}")
        return {"error": str(e)}


def parse_ldp(root) -> Dict[str, Any]:
    """Parse LDP session information."""
    try:
        sessions = []

        for session in root.findall(".//ldp-session"):
            session_data = {
                "ldp_id": session.findtext("ldp-neighbor-id"),
                "state": session.findtext("ldp-session-state"),
                "uptime": session.findtext("uptime"),
                "interface": session.findtext("interface-name")
            }
            sessions.append(session_data)

        return {
            "ldp_sessions": sessions,
            "total_count": len(sessions),
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing LDP: {e}")
        return {"error": str(e)}


def parse_mpls(root) -> Dict[str, Any]:
    """Parse MPLS LSP information."""
    try:
        lsps = []

        for lsp in root.findall(".//mpls-lsp"):
            lsp_data = {
                "name": lsp.findtext("lsp-name"),
                "state": lsp.findtext("lsp-state"),
                "path_type": lsp.findtext("lsp-path-type"),
                "uptime": lsp.findtext("uptime")
            }
            lsps.append(lsp_data)

        return {
            "mpls_lsps": lsps,
            "total_count": len(lsps),
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing MPLS: {e}")
        return {"error": str(e)}


def parse_rsvp(root) -> Dict[str, Any]:
    """Parse RSVP session information."""
    try:
        sessions = []

        for session in root.findall(".//rsvp-session"):
            session_data = {
                "destination": session.findtext("destination-address"),
                "state": session.findtext("session-state"),
                "uptime": session.findtext("uptime"),
                "name": session.findtext("session-name")
            }
            sessions.append(session_data)

        return {
            "rsvp_sessions": sessions,
            "total_count": len(sessions),
            "format": "structured"
        }
    except Exception as e:
        logger.error(f"Error parsing RSVP: {e}")
        return {"error": str(e)}


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
