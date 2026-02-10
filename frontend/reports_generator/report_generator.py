"""
Device Reports Generator for Aether Platform

This module provides a modular, extensible framework for generating
device reports using Juniper PyEZ. It supports running multiple report
types against one or more Juniper devices (EX, MX, SRX series).

Report Types:
    - Device OS: Operating system version and hardware information
    - Interfaces: Interface status and configuration
    - Interface Statistics: Detailed interface statistics
    - OSPF: OSPF protocol status and neighbor information
    - BGP: BGP protocol status and peer information
    - Routes: Routing table information
    - LDP: LDP label distribution sessions
    - MPLS: MPLS LSP status
    - RSVP: RSVP signaling sessions

Usage:
    from report_generator import DeviceReportGenerator

    generator = DeviceReportGenerator()
    results = await generator.generate_reports(
        devices=['192.168.1.1', '192.168.1.2'],
        report_types=['device_os', 'interfaces', 'bgp'],
        username='admin',
        password='password'
    )

To add a new report type:
    1. Define the report in the REPORT_REGISTRY below
    2. Create a parser function following the pattern
    3. Add the parser to the REPORT_REGISTRY
"""

import asyncio
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
from jnpr.junos import Device
from jnpr.junos.exception import ConnectError, RpcError
import xml.etree.ElementTree as ET

# =============================================================================
# REPORT REGISTRY - Easy to add new reports!
# =============================================================================
# To add a new report, add an entry here with a parser function

REPORT_REGISTRY = {
    "device_os": {
        "name": "Device OS",
        "description": "Operating system version and hardware information",
        "category": "System",
        "rpc": "get-software-information",
        "timeout": 30,
        "parser": "parse_device_os"
    },
    "interfaces": {
        "name": "Interfaces",
        "description": "Interface status and configuration summary",
        "category": "Interfaces",
        "rpc": "get-interface-information",
        "rpc_args": {},
        "timeout": 45,
        "parser": "parse_interfaces"
    },
    "interfaces_stats": {
        "name": "Interface Statistics",
        "description": "Detailed interface statistics and error counters",
        "category": "Interfaces",
        "rpc": "get-interface-information",
        "rpc_args": {"extensive": True},
        "timeout": 60,
        "parser": "parse_interfaces"
    },
    "ospf": {
        "name": "OSPF",
        "description": "OSPF protocol status and neighbor information",
        "category": "Protocols",
        "rpc": "get-ospf-neighbor-information",
        "timeout": 30,
        "parser": "parse_ospf"
    },
    "bgp": {
        "name": "BGP",
        "description": "BGP protocol status and peer information",
        "category": "Protocols",
        "rpc": "get-bgp-summary-information",
        "timeout": 30,
        "parser": "parse_bgp"
    },
    "routes": {
        "name": "Routes",
        "description": "Routing table information",
        "category": "Protocols",
        "rpc": "get-route-information",
        "timeout": 45,
        "parser": "parse_routes"
    },
    "ldp": {
        "name": "LDP",
        "description": "LDP label distribution sessions",
        "category": "MPLS",
        "rpc": "get-ldp-session-information",
        "timeout": 30,
        "parser": "parse_ldp"
    },
    "mpls": {
        "name": "MPLS LSPs",
        "description": "MPLS label-switched path status",
        "category": "MPLS",
        "rpc": "get-mpls-lsp-information",
        "timeout": 30,
        "parser": "parse_mpls"
    },
    "rsvp": {
        "name": "RSVP",
        "description": "RSVP signaling sessions",
        "category": "MPLS",
        "rpc": "get-rsvp-session-information",
        "timeout": 30,
        "parser": "parse_rsvp"
    },
}


# =============================================================================
# REPORT PARSERS - Convert XML RPC responses to structured data
# =============================================================================

def parse_device_os(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse device OS information from get-software-information RPC."""
    software_info = {}

    # Helper to find text with default
    def find_text(parent, tag, default="Unknown"):
        elem = parent.findtext(tag, default=default)
        return elem.strip() if elem else default

    software_info = {
        "hostname": find_text(rpc_response, "host-name"),
        "model": find_text(rpc_response, "product-model"),
        "version": find_text(rpc_response, "junos-version"),
        "serial_number": find_text(rpc_response, "serial-number"),
    }

    return {
        "software_information": software_info,
        "format": "structured"
    }


def parse_interfaces(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse interface information from get-interface-information RPC."""
    interfaces = []

    for interface in rpc_response.findall(".//physical-interface"):
        name_elem = interface.find("name")
        if name_elem is not None and name_elem.text:
            interface_data = {
                "name": name_elem.text.strip(),
                "admin_status": interface.findtext("admin-status", default="Unknown").strip(),
                "oper_status": interface.findtext("oper-status", default="Unknown").strip(),
                "description": interface.findtext("description", default="").strip(),
                "mtu": interface.findtext("mtu", default="Unknown").strip(),
                "speed": interface.findtext("speed", default="Unknown").strip(),
                "mac_address": interface.findtext("mac-address", default="Unknown").strip(),
            }

            # Add logical interfaces if present
            logical_interfaces = []
            for logical in interface.findall(".//logical-interface"):
                logical_name = logical.find("name")
                if logical_name is not None:
                    logical_interfaces.append({
                        "name": logical_name.text.strip(),
                        "description": logical.findtext("description", default="").strip()
                    })

            if logical_interfaces:
                interface_data["logical_interfaces"] = logical_interfaces

            interfaces.append(interface_data)

    return {
        "interfaces": interfaces,
        "total_count": len(interfaces),
        "format": "structured"
    }


def parse_ospf(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse OSPF neighbor information from get-ospf-neighbor-information RPC."""
    neighbors = []

    for neighbor in rpc_response.findall(".//ospf-neighbor"):
        neighbor_data = {
            "neighbor_id": neighbor.findtext("neighbor-id", default="Unknown").strip(),
            "interface": neighbor.findtext("interface-name", default="Unknown").strip(),
            "state": neighbor.findtext("ospf-neighbor-state", default="Unknown").strip(),
            "priority": neighbor.findtext("neighbor-priority", default="Unknown").strip(),
            "dead_time": neighbor.findtext("neighbor-dead-time", default="Unknown").strip(),
            "adjacency_state": neighbor.findtext("adjacency-state", default="Unknown").strip(),
        }
        neighbors.append(neighbor_data)

    return {
        "ospf_neighbors": neighbors,
        "total_count": len(neighbors),
        "format": "structured"
    }


def parse_bgp(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse BGP summary information from get-bgp-summary-information RPC."""
    peers = []

    for peer in rpc_response.findall(".//bgp-peer"):
        peer_data = {
            "peer_address": peer.findtext("peer-address", default="Unknown").strip(),
            "peer_as": peer.findtext("peer-as", default="Unknown").strip(),
            "state": peer.findtext("peer-state", default="Unknown").strip(),
            "flaps": peer.findtext("flap-count", default="0").strip(),
            "uptime": peer.findtext("elapsed-time", default="Unknown").strip(),
            "input_messages": peer.findtext("input-messages", default="0").strip(),
            "output_messages": peer.findtext("output-messages", default="0").strip(),
        }
        peers.append(peer_data)

    return {
        "bgp_peers": peers,
        "total_count": len(peers),
        "format": "structured"
    }


def parse_routes(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse routing table information from get-route-information RPC."""
    routes = []
    route_tables = []

    # Parse route tables first
    for table in rpc_response.findall(".//route-table"):
        table_name = table.findtext("table-name", default="Unknown").strip()
        destinations = table.findtext("destination-count", default="0").strip()
        total_routes = table.findtext("route-count", default="0").strip()

        route_tables.append({
            "table_name": table_name,
            "destinations": int(destinations) if destinations.isdigit() else 0,
            "total_routes": int(total_routes) if total_routes.isdigit() else 0
        })

    # Parse individual routes (limit to first 100 for performance)
    count = 0
    for route in rpc_response.findall(".//rt-entry"):
        if count >= 100:
            break

        route_data = {
            "destination": route.findtext("rt-destination", default="Unknown").strip(),
            "protocol": route.findtext("protocol-name", default="Unknown").strip(),
            "age": route.findtext("age", default="Unknown").strip(),
            "next_hop": route.findtext("nh/to", default="Unknown").strip(),
            "preference": route.findtext("preference", default="Unknown").strip(),
        }
        routes.append(route_data)
        count += 1

    return {
        "route_tables": route_tables,
        "routes": routes,
        "total_routes": sum(rt["total_routes"] for rt in route_tables),
        "format": "structured"
    }


def parse_ldp(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse LDP session information from get-ldp-session-information RPC."""
    sessions = []

    for session in rpc_response.findall(".//ldp-session"):
        session_data = {
            "ldp_id": session.findtext("ldp-neighbor-id", default="Unknown").strip(),
            "state": session.findtext("ldp-session-state", default="Unknown").strip(),
            "uptime": session.findtext("uptime", default="Unknown").strip(),
            "interface": session.findtext("interface-name", default="Unknown").strip(),
            "connection_state": session.findtext("connection-state", default="Unknown").strip(),
        }
        sessions.append(session_data)

    return {
        "ldp_sessions": sessions,
        "total_count": len(sessions),
        "format": "structured"
    }


def parse_mpls(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse MPLS LSP information from get-mpls-lsp-information RPC."""
    lsps = []

    for lsp in rpc_response.findall(".//mpls-lsp"):
        lsp_data = {
            "name": lsp.findtext("lsp-name", default="Unknown").strip(),
            "state": lsp.findtext("lsp-state", default="Unknown").strip(),
            "path_type": lsp.findtext("lsp-path-type", default="Unknown").strip(),
            "uptime": lsp.findtext("uptime", default="Unknown").strip(),
            "destination": lsp.findtext("lsp-dst", default="Unknown").strip(),
        }
        lsps.append(lsp_data)

    return {
        "mpls_lsps": lsps,
        "total_count": len(lsps),
        "format": "structured"
    }


def parse_rsvp(rpc_response: ET.Element) -> Dict[str, Any]:
    """Parse RSVP session information from get-rsvp-session-information RPC."""
    sessions = []

    for session in rpc_response.findall(".//rsvp-session"):
        session_data = {
            "destination": session.findtext("session-dst-addr", default="Unknown").strip(),
            "state": session.findtext("session-state", default="Unknown").strip(),
            "uptime": session.findtext("uptime", default="Unknown").strip(),
            "name": session.findtext("session-name", default="").strip(),
            "type": session.findtext("session-type", default="Unknown").strip(),
        }
        sessions.append(session_data)

    return {
        "rsvp_sessions": sessions,
        "total_count": len(sessions),
        "format": "structured"
    }


# =============================================================================
# MAIN REPORT GENERATOR CLASS
# =============================================================================

class DeviceReportGenerator:
    """
    Main class for generating device reports.

    Handles connecting to devices, executing report commands,
    and parsing results into structured data.
    """

    def __init__(self):
        """Initialize the report generator."""
        self.report_types = list(REPORT_REGISTRY.keys())

    def get_available_reports(self) -> List[Dict[str, Any]]:
        """
        Get list of all available report types.

        Returns:
            List of report type dictionaries with metadata
        """
        return [
            {
                "id": report_id,
                **report_config
            }
            for report_id, report_config in REPORT_REGISTRY.items()
        ]

    def get_report_info(self, report_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific report type.

        Args:
            report_id: The report type identifier

        Returns:
            Report configuration dict or None if not found
        """
        if report_id in REPORT_REGISTRY:
            return {
                "id": report_id,
                **REPORT_REGISTRY[report_id]
            }
        return None

    def validate_report_types(self, report_types: List[str]) -> tuple[bool, List[str]]:
        """
        Validate that requested report types exist.

        Args:
            report_types: List of report type IDs to validate

        Returns:
            Tuple of (is_valid, invalid_types)
        """
        invalid = [rt for rt in report_types if rt not in REPORT_REGISTRY]
        return (len(invalid) == 0, invalid)

    async def generate_report(
        self,
        device: Device,
        report_type: str
    ) -> Dict[str, Any]:
        """
        Generate a single report type for a device.

        Args:
            device: Connected PyEZ Device object
            report_type: Report type ID to generate

        Returns:
            Structured report data
        """
        if report_type not in REPORT_REGISTRY:
            return {
                "status": "error",
                "error": f"Unknown report type: {report_type}",
                "timestamp": datetime.now().isoformat()
            }

        report_config = REPORT_REGISTRY[report_type]

        try:
            # Execute RPC call
            rpc_args = report_config.get("rpc_args", {})

            # Execute RPC with normalize=True to get structured data
            if rpc_args:
                rpc_response = device.rpc(report_config["rpc"], normalize=True, **rpc_args)
            else:
                rpc_response = device.rpc(report_config["rpc"], normalize=True)

            # Parse the response
            parser_func = globals().get(report_config["parser"])
            if parser_func:
                report_data = parser_func(rpc_response)
            else:
                # Default: return as XML string
                xml_str = ET.tostring(rpc_response, encoding='unicode')
                report_data = {
                    "raw_xml": xml_str,
                    "format": "xml"
                }

            return {
                "status": "success",
                "name": report_config["name"],
                "description": report_config["description"],
                "rpc": report_config["rpc"],
                "data": report_data,
                "timestamp": datetime.now().isoformat()
            }

        except RpcError as e:
            return {
                "status": "error",
                "error": f"RPC Error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": f"Unexpected error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    async def generate_reports_for_device(
        self,
        hostname: str,
        username: str,
        password: str,
        report_types: List[str],
        port: int = 22
    ) -> Dict[str, Any]:
        """
        Generate multiple reports for a single device.

        Args:
            hostname: Device hostname or IP
            username: SSH username
            password: SSH password
            report_types: List of report type IDs
            port: SSH port (default: 22)

        Returns:
            Dictionary with all report results
        """
        device = None
        results = {}

        try:
            # Validate report types
            is_valid, invalid = self.validate_report_types(report_types)
            if not is_valid:
                return {
                    "hostname": hostname,
                    "status": "error",
                    "error": f"Invalid report types: {invalid}",
                    "reports": {}
                }

            # Connect to device
            device = Device(
                host=hostname,
                user=username,
                password=password,
                port=port
            )
            device.open()

            # Get device facts
            facts = device.facts
            device_info = {
                "hostname": facts.get("hostname", hostname),
                "model": facts.get("model", "Unknown"),
                "version": facts.get("version", "Unknown"),
                "serial": facts.get("serialnumber", "Unknown")
            }

            # Generate each report
            for report_type in report_types:
                result = await self.generate_report(device, report_type)
                results[report_type] = result

            return {
                "hostname": hostname,
                "device_info": device_info,
                "reports": results,
                "total_reports": len(report_types),
                "successful": sum(1 for r in results.values() if r.get("status") == "success"),
                "failed": sum(1 for r in results.values() if r.get("status") == "error"),
                "timestamp": datetime.now().isoformat()
            }

        except ConnectError as e:
            return {
                "hostname": hostname,
                "status": "error",
                "error": f"Connection failed: {str(e)}",
                "reports": {}
            }
        except Exception as e:
            return {
                "hostname": hostname,
                "status": "error",
                "error": f"Unexpected error: {str(e)}",
                "reports": {}
            }
        finally:
            if device and device.connected:
                device.close()

    async def generate_reports(
        self,
        devices: List[str],
        report_types: List[str],
        username: str,
        password: str,
        port: int = 22
    ) -> Dict[str, Any]:
        """
        Generate reports for multiple devices.

        Args:
            devices: List of device hostnames or IPs
            report_types: List of report type IDs
            username: SSH username
            password: SSH password
            port: SSH port (default: 22)

        Returns:
            Dictionary with results for all devices
        """
        overall_results = {}

        for device_hostname in devices:
            result = await self.generate_reports_for_device(
                device_hostname,
                username,
                password,
                report_types,
                port
            )
            overall_results[device_hostname] = result

        return {
            "devices": overall_results,
            "total_devices": len(devices),
            "report_types": report_types,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_reports": len(devices) * len(report_types),
                "successful": sum(
                    r.get("successful", 0)
                    for r in overall_results.values()
                ),
                "failed": sum(
                    r.get("failed", 0)
                    for r in overall_results.values()
                )
            }
        }


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

async def generate_device_reports(
    devices: List[str],
    report_types: List[str],
    username: str,
    password: str,
    port: int = 22
) -> Dict[str, Any]:
    """
    Convenience function to generate device reports.

    Args:
        devices: List of device hostnames or IPs
        report_types: List of report type IDs
        username: SSH username
        password: SSH password
        port: SSH port (default: 22)

    Returns:
        Dictionary with results for all devices

    Example:
        results = await generate_device_reports(
            devices=['192.168.1.1', '192.168.1.2'],
            report_types=['device_os', 'interfaces', 'bgp'],
            username='admin',
            password='secret'
        )
    """
    generator = DeviceReportGenerator()
    return await generator.generate_reports(
        devices, report_types, username, password, port
    )


# =============================================================================
# MAIN (for standalone testing)
# =============================================================================

if __name__ == "__main__":
    import asyncio
    from getpass import getpass
    import json

    async def main():
        generator = DeviceReportGenerator()

        # Display available reports
        print("=" * 60)
        print("Available Report Types:")
        print("=" * 60)
        reports = generator.get_available_reports()
        for report in reports:
            print(f"  [{report['id']}] {report['name']}")
            print(f"      Category: {report['category']}")
            print(f"      Description: {report['description']}")
            print(f"      RPC: {report['rpc']}")
            print()

        # Get user input
        print("=" * 60)
        devices_input = input("Enter device IPs (comma-separated): ").strip()
        devices = [d.strip() for d in devices_input.split(",") if d.strip()]

        reports_input = input("Enter report types (comma-separated, or 'all'): ").strip()
        if reports_input.lower() == 'all':
            report_types = generator.report_types
        else:
            report_types = [r.strip() for r in reports_input.split(",") if r.strip()]

        username = input("Enter username: ").strip()
        password = getpass("Enter password: ")

        # Generate reports
        print("\n" + "=" * 60)
        print("Generating reports...")
        print("=" * 60)

        results = await generator.generate_reports(
            devices=devices,
            report_types=report_types,
            username=username,
            password=password
        )

        # Display results
        print("\n" + "=" * 60)
        print("Results:")
        print("=" * 60)
        print(json.dumps(results, indent=2, default=str))

        # Save to file
        output_file = f"device_reports_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\nResults saved to: {output_file}")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
