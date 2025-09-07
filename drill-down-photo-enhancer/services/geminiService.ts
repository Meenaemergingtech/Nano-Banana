import { GoogleGenAI, Modality, Part } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createEditPrompt = (customPrompt: string, hasMask: boolean, hasSource: boolean, hasReference: boolean) => {
    let prompt = `You are an expert AI photo editor. Your task is to modify an image according to the user's instructions.

**Primary Goal:** Fulfill the user's request: "${customPrompt}"

**Provided Images (in order):**
1.  **Original Image:** The image to be edited.`;

    let inputCounter = 2;
    if (hasSource) prompt += `\n${inputCounter++}. **Source Patch:** A texture/content sample to use for the edit.`;
    if (hasReference) prompt += `\n${inputCounter++}. **Reference Image:** An image for style or content inspiration.`;
    if (hasMask) prompt += `\n${inputCounter++}. **Mask Image:** A black and white image where the white area defines the exact region to edit.`;

    prompt += `\n\n**Instructions:**`;

    if (hasMask) {
        prompt += `\n- Your edit MUST be strictly confined to the white area defined by the **Mask Image**.`;
        prompt += `\n- The black areas of the mask must remain completely unchanged from the **Original Image**.`;
    } else {
        prompt += `\n- Apply the edit to the **Original Image** as described in the user's request.`;
    }

    if (hasReference) {
        prompt += `\n- Use the **Reference Image** as the primary inspiration for the style or content of the edit.`;
    }
    if (hasSource) {
        prompt += `\n- Use the **Source Patch** for specific textures or patterns needed for the edit.`;
    }

    prompt += `\n- The final result must be a photorealistic, seamlessly blended image.`;
    prompt += `\n- **CRITICAL:** You MUST return the complete, full-frame image. DO NOT crop the image or return only the edited part.`;

    return prompt;
};


export const editPhoto = async (
    base64ImageData: string, 
    mimeType: string,
    prompt: string,
    maskBase64Data: string | null,
    sourceBase64Data: string | null,
    referenceImage: { base64Data: string; mimeType: string; } | null
): Promise<string | null> => {
  try {
    const fullPrompt = createEditPrompt(prompt, !!maskBase64Data, !!sourceBase64Data, !!referenceImage);

    const parts: Part[] = [
        { text: fullPrompt },
        {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
        },
    ];

    if (sourceBase64Data) {
        parts.push({
            inlineData: {
                data: sourceBase64Data,
                mimeType: 'image/png',
            }
        });
    }

    if (referenceImage) {
        parts.push({
            inlineData: {
                data: referenceImage.base64Data,
                mimeType: referenceImage.mimeType,
            }
        });
    }

    if (maskBase64Data) {
        parts.push({
            inlineData: {
                data: maskBase64Data,
                mimeType: 'image/png',
            }
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts,
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    // Handle cases where the model might return a text response instead of an image
    if (response.candidates[0].content.parts[0]?.text) {
        const textResponse = response.candidates[0].content.parts[0].text;
        console.error("Model returned a text response:", textResponse);
        throw new Error(`The AI model responded with text instead of an image: "${textResponse.substring(0, 100)}..."`);
    }

    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("400 Bad Request")) {
       throw new Error("The request was blocked. This may be due to the prompt or image content. Please try again with a different request.");
    }
    throw new Error("Failed to communicate with the AI model.");
  }
};