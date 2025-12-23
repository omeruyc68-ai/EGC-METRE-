
export type EntryCategory = 'element' | 'anchorage';
export type ElementType = '2D' | '3D';
export type SlopeUnit = 'percentage' | 'ratio';

export interface MetreElement {
  id: string;
  name: string;
  category: EntryCategory;
  type?: ElementType; // Only for category 'element'
  area2d?: number;    // Only for category 'element'
  slopeUnit?: SlopeUnit;
  slopeValue?: number;
  anchorageLength?: number;         // Only for category 'anchorage'
  anchorageDevelopedWidth?: number; // Only for category 'anchorage'
  images: string[];
}

export interface CalculationGroup {
  id: string;
  name: string;
  elements: MetreElement[];
}

export interface GroupResults {
  groupId: string;
  subTotalArea: number;
  subTotalAnchorage: number;
  total: number;
}

export interface CalculationResults {
  totalArea: number;
  totalAnchorage: number;
  totalFinal: number;
  groups: GroupResults[];
}

export interface ProjectData {
  name: string;
  client: string;
  groups: CalculationGroup[];
  results: CalculationResults;
  date: string;
}
