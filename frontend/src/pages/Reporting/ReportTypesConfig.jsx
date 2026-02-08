/**
 * Report Types Configuration for Device Reports
 * Defines all available report types with their metadata
 */

export const REPORT_CATEGORIES = {
  SYSTEM: 'System',
  PROTOCOLS: 'Protocols',
  MPLS: 'MPLS',
  INTERFACES: 'Interfaces',
};

export const REPORT_TYPES = [
  {
    id: 'device_os',
    name: 'Device OS',
    description: 'Operating system version and hardware information',
    category: REPORT_CATEGORIES.SYSTEM,
    command: 'show version',
    timeout: 30,
    icon: 'Cpu',
  },
  {
    id: 'interfaces',
    name: 'Interfaces',
    description: 'Interface status and configuration summary',
    category: REPORT_CATEGORIES.INTERFACES,
    command: 'show interfaces',
    timeout: 45,
    icon: 'Network',
  },
  {
    id: 'interfaces_stats',
    name: 'Interface Statistics',
    description: 'Detailed interface statistics and error counters',
    category: REPORT_CATEGORIES.INTERFACES,
    command: 'show interfaces extensive',
    timeout: 60,
    icon: 'BarChart3',
  },
  {
    id: 'ospf',
    name: 'OSPF',
    description: 'OSPF protocol status and neighbor information',
    category: REPORT_CATEGORIES.PROTOCOLS,
    command: 'show ospf neighbor',
    timeout: 30,
    icon: 'GitBranch',
  },
  {
    id: 'bgp',
    name: 'BGP',
    description: 'BGP protocol status and peer information',
    category: REPORT_CATEGORIES.PROTOCOLS,
    command: 'show bgp summary',
    timeout: 30,
    icon: 'Globe',
  },
  {
    id: 'routes',
    name: 'Routes',
    description: 'Routing table information',
    category: REPORT_CATEGORIES.PROTOCOLS,
    command: 'show route',
    timeout: 45,
    icon: 'Route',
  },
  {
    id: 'ldp',
    name: 'LDP',
    description: 'LDP label distribution sessions',
    category: REPORT_CATEGORIES.MPLS,
    command: 'show ldp session',
    timeout: 30,
    icon: 'Tag',
  },
  {
    id: 'mpls',
    name: 'MPLS LSPs',
    description: 'MPLS label-switched path status',
    category: REPORT_CATEGORIES.MPLS,
    command: 'show mpls lsp',
    timeout: 30,
    icon: 'Layers',
  },
  {
    id: 'rsvp',
    name: 'RSVP',
    description: 'RSVP signaling sessions',
    category: REPORT_CATEGORIES.MPLS,
    command: 'show rsvp session',
    timeout: 30,
    icon: 'Timer',
  },
];

/**
 * Get report types by category
 */
export const getReportTypesByCategory = () => {
  const grouped = {};
  REPORT_TYPES.forEach((report) => {
    if (!grouped[report.category]) {
      grouped[report.category] = [];
    }
    grouped[report.category].push(report);
  });
  return grouped;
};

/**
 * Get report type by ID
 */
export const getReportTypeById = (id) => {
  return REPORT_TYPES.find((report) => report.id === id);
};

/**
 * Get all category names
 */
export const getCategories = () => {
  return Object.values(REPORT_CATEGORIES);
};

/**
 * Validate selected report types
 */
export const validateReportTypes = (selectedIds) => {
  const invalidIds = selectedIds.filter(
    (id) => !REPORT_TYPES.some((report) => report.id === id)
  );
  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
};

export default REPORT_TYPES;
