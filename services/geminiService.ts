
import { GoogleGenAI } from "@google/genai";
import { ProjectData } from "../types";

export const analyzeProjectWithAI = async (project: ProjectData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const groupsDesc = project.groups.map(group => {
    const elDesc = group.elements.map(el => 
      `- [${el.category.toUpperCase()}] ${el.name}: ${el.category === 'element' ? `${el.area2d}m² (${el.type})` : `${el.anchorageLength}ml x ${el.anchorageDevelopedWidth}m`}`
    ).join('\n    ');
    return `Groupe: ${group.name}\n    ${elDesc}`;
  }).join('\n');

  const textPart = {
    text: `
      Expert EGC Galopin - Analyse de Métré Groupé :
      Projet : ${project.name}
      Client : ${project.client}
      
      Détail par groupes :
      ${groupsDesc}

      Totaux :
      - Surfaces Bassins : ${project.results.totalArea.toFixed(2)}m²
      - Ancrages : ${project.results.totalAnchorage.toFixed(2)}m²
      - Total GÉOMEMBRANE : ${project.results.totalFinal.toFixed(2)}m²

      Analyse la cohérence technique de ces groupes. Vérifie si les ancrages correspondent aux surfaces (ratio ml/m²).
    `
  };

  const imageParts = project.groups.flatMap(g => g.elements.flatMap(el => 
    el.images.map(img => ({
      inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] }
    }))
  )).slice(0, 10);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [textPart, ...imageParts] },
    });
    return response.text || "Analyse indisponible.";
  } catch (error) {
    return "Erreur d'analyse IA.";
  }
};
