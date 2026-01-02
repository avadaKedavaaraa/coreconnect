
import { Lineage } from "../types";
import { API_URL } from "../App";

interface ChatHistory {
  role: 'user' | 'model';
  text: string;
}

export const consultTheOracle = async (
  lineage: Lineage,
  query: string,
  history: ChatHistory[] = [],
  context: string = ""
): Promise<string> => {
  try {
    const res = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        lineage,
        history,
        context
      })
    });

    // OPTION C: Read as text first to debug and prevent crash
    const text = await res.text();

    try {
        const data = JSON.parse(text);
        
        if (!res.ok) {
            throw new Error(data.error || "Connection Severed");
        }
        
        return data.text;
    } catch (e) {
        // This catches "Unexpected end of JSON input"
        console.error("Oracle API returned non-JSON:", text.substring(0, 100));
        throw new Error("The Oracle is temporarily silent (Invalid Response).");
    }

  } catch (error: any) {
    console.error("AI Error:", error);
    const errorMessage = error.message || "Unknown error";
    
    if (lineage === Lineage.WIZARD) {
      return `The mists are too thick... I cannot see the answer right now. (${errorMessage})`;
    } else {
      return `ERROR: 503 SERVICE_UNAVAILABLE. DETAILS: ${errorMessage}`;
    }
  }
};
