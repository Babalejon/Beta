export interface Law {
  id: string;
  title: string;
  summary: string;
  url?: string;
  type: 'Lag' | 'Föreskrift' | 'ISO-standard' | 'Annat';
}

export interface ChecklistItem {
  id: string;
  task: string;
  description: string;
  isCompleted: boolean;
}

export interface OrganizationLaw extends Law {
  isApplicable: boolean;
  checklist?: ChecklistItem[];
}
