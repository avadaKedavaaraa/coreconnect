
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

    const text = await res.text();

    try {
        const data = JSON.parse(text);
        if (!res.ok) {
            throw new Error(data.error || `Server Error: ${res.status}`);
        }
        return data.text;
    } catch (e) {
        // If parsing fails, it's likely a 502/500 HTML page from Netlify/Nginx
        console.error("Oracle API Parsing Error. Raw response:", text.substring(0, 200));
        if (text.includes("Bad Gateway") || text.includes("502")) {
             throw new Error("The Oracle's connection is severed (502 Bad Gateway). Please try again later.");
        }
        if (text.includes("timeout")) {
             throw new Error("The Oracle is deep in thought... too deep (Timeout).");
        }
        throw new Error("The Oracle returned an unintelligible response.");
    }

  } catch (error: any) {
    console.error("AI Error:", error);
    const errorMessage = error.message || "Unknown error";
    
    if (lineage === Lineage.WIZARD) {
      return `The mists are too thick... I cannot see the answer right now. (${errorMessage})`;
    } else {
      return `ERROR: SERVICE_UNAVAILABLE. DETAILS: ${errorMessage}`;
    }
  }
};
