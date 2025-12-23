
import { MetreElement, CalculationResults, CalculationGroup, EntryCategory, SlopeUnit } from '../types';

export const calculateSlopeFactor = (value: number, unit: SlopeUnit): number => {
  if (value <= 0) return 1;
  if (unit === 'percentage') {
    return Math.sqrt(1 + Math.pow(value / 100, 2));
  } else {
    return Math.sqrt(1 + Math.pow(1 / value, 2));
  }
};

export const calculateProject = (groups: CalculationGroup[]): CalculationResults => {
  let totalArea = 0;
  let totalAnchorage = 0;

  const groupResults = groups.map(group => {
    let subTotalArea = 0;
    let subTotalAnchorage = 0;

    group.elements.forEach(el => {
      if (el.category === 'element') {
        const factor = el.type === '3D' ? calculateSlopeFactor(el.slopeValue || 0, el.slopeUnit || 'ratio') : 1;
        subTotalArea += (el.area2d || 0) * factor;
      } else if (el.category === 'anchorage') {
        subTotalAnchorage += (el.anchorageLength || 0) * (el.anchorageDevelopedWidth || 0);
      }
    });

    totalArea += subTotalArea;
    totalAnchorage += subTotalAnchorage;

    return {
      groupId: group.id,
      subTotalArea,
      subTotalAnchorage,
      total: subTotalArea + subTotalAnchorage
    };
  });

  return {
    totalArea,
    totalAnchorage,
    totalFinal: totalArea + totalAnchorage,
    groups: groupResults
  };
};
