import { Law, ChecklistItem } from '../types';

export async function analyzeOrganization(answers: Record<string, string | string[]>): Promise<Law[]> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    if (!response.ok) throw new Error('Failed to analyze');
    return await response.json();
  } catch (e) {
    console.error('Failed to parse analysis', e);
    return [];
  }
}

export async function fetchRequirements(type: 'laws' | 'regulations' | 'iso9001' | 'iso14001'): Promise<Law[]> {
  try {
    const response = await fetch('/api/requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    if (!response.ok) throw new Error('Failed to fetch requirements');
    return await response.json();
  } catch (e) {
    console.error('Failed to parse requirements', e);
    return [];
  }
}

export async function generateChecklistForLaw(lawTitle: string, lawSummary: string): Promise<ChecklistItem[]> {
  try {
    const response = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: lawTitle, summary: lawSummary })
    });
    if (!response.ok) throw new Error('Failed to generate checklist');
    const items = await response.json();
    return items.map((item: any) => ({ ...item, isCompleted: false }));
  } catch (e) {
    console.error('Failed to parse checklist', e);
    return [];
  }
}
