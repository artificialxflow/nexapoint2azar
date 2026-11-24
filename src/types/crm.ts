export interface CrmLead {
  id: string;
  name: string;
  source: string;
  interest: string;
  registeredDate: string;
  status: string;
}

export interface CrmVisit {
  id: string;
  customerName: string;
  phone: string;
  source: string;
  companions: number;
  withDesigner: boolean;
  gender: 'female' | 'male';
  buyProbability: number;
  visitedAt: string;
  result: string;
  designerName: string;
  durationMinutes: number;
}

export interface CrmPipelineStage {
  id: string;
  title: string;
  sortOrder: number;
  color: string;
}

export interface CrmOpportunity {
  id: string;
  stageId: string;
  title: string;
  leadId?: string;
  personId?: string;
  amount?: number;
  expectedClose: string;
  sortOrder: number;
}

export interface CrmClubMember {
  id: string;
  personId?: string;
  name: string;
  phone: string;
  level: string;
  score: number;
  lastVisit: string;
  status: string;
  source: string;
}
