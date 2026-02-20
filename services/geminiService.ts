
import { GoogleGenAI } from "@google/genai";

export const getGeminiStory = async (productName: string, producerName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `En tant qu'expert en gastronomie bio, raconte une courte histoire captivante (max 100 mots) sur le produit "${productName}" produit par "${producerName}". Souligne la qualité du terroir et suggère une idée de recette simple et élégante.`,
      config: {
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ce produit est issu d'une agriculture respectueuse de l'environnement, garantissant une saveur authentique et une qualité nutritionnelle exceptionnelle.";
  }
};
