// Rule-based processing service for Arogya Sarathi
// Backend-connected deterministic logic (NO AI dependency)

const API_BASE = "http://localhost:4000";

// =======================
// Interfaces
// =======================

export interface TriageResult {
  findings: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  category: string;
}

export interface DeltaSyncResult {
  summary: string;
  suggestedSpecialty: string;
  packetSize: string;
}

export interface PatientResponse {
  text: string;
  icons: ("SUN" | "MOON" | "FOOD")[];
}

// =======================
// Processing Service
// =======================

class ProcessingService {
  // -----------------------
  // VISUAL TRIAGE (RULE-BASED)
  // -----------------------
  triageVisualData(imageData: string): TriageResult {
    const imageHash = this.simpleHash(imageData);

    const patterns = [
      { urgency: "MEDIUM", category: "Dermatology" },
      { urgency: "HIGH", category: "Surgery" },
      { urgency: "HIGH", category: "Orthopedics" },
      { urgency: "MEDIUM", category: "Ophthalmology" },
      { urgency: "LOW", category: "Dermatology" },
    ];

    const matched = patterns[imageHash % patterns.length];

    return {
      findings: `Visual indicators suggest ${matched.category} concern`,
      urgency: matched.urgency as "LOW" | "MEDIUM" | "HIGH",
      category: matched.category,
    };
  }

  // -----------------------
  // DELTA SYNC → BACKEND
  // -----------------------
  async generateDeltaSync(
    vault: any,
    symptoms: string
  ): Promise<DeltaSyncResult> {
    try {
      // Determine current symptoms severity
      const symptomLower = symptoms.toLowerCase();
      let severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
      if (
        symptomLower.includes("severe") ||
        symptomLower.includes("chest") ||
        symptomLower.includes("heart")
      ) {
        severity = "HIGH";
      } else if (
        symptomLower.includes("mild") ||
        symptomLower.includes("slight")
      ) {
        severity = "LOW";
      }

      const currentSymptoms = {
        description: symptoms,
        severity,
        duration: "Current episode", // Could be enhanced with actual duration
        additionalNotes: "Patient submitted via mobile app",
      };

      const response = await fetch(`${API_BASE}/api/delta-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vault,
          newSymptoms: symptoms,
          currentSymptoms,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      return {
        summary: result.summary,
        suggestedSpecialty: result.suggestedSpecialty,
        packetSize: result.packetSize || "8KB",
      };
    } catch (error) {
      console.error("❌ Delta sync failed:", error);

      // Local fallback (offline-safe)
      const text = symptoms.toLowerCase();
      let specialty = "General Medicine";

      if (text.includes("chest") || text.includes("heart"))
        specialty = "Cardiology";
      else if (text.includes("brain") || text.includes("head"))
        specialty = "Neurology";
      else if (text.includes("bone") || text.includes("joint"))
        specialty = "Orthopedics";
      else if (text.includes("skin") || text.includes("rash"))
        specialty = "Dermatology";

      return {
        summary: `Patient reports: ${symptoms}`,
        suggestedSpecialty: specialty,
        packetSize: "8KB",
      };
    }
  }

  // -----------------------
  // SPEECH → TEXT (DEMO)
  // -----------------------
  async speechToText(audioData: string): Promise<string> {
    await this.delay(800);

    const responses = [
      "I have fever and headache",
      "My stomach is paining",
      "I feel dizzy",
      "I have chest pain",
      "My back hurts",
    ];

    return responses[this.simpleHash(audioData) % responses.length];
  }

  // -----------------------
  // DOCTOR → PATIENT RESPONSE
  // -----------------------
  generatePatientResponse(
    clinicalContext: string,
    medication: string
  ): PatientResponse {
    if (medication && medication.trim()) {
      return {
        text: `Take ${medication} as prescribed. Complete the full course.`,
        icons: ["SUN", "MOON", "FOOD"],
      };
    }

    return {
      text: `${clinicalContext}. Rest well and stay hydrated.`,
      icons: ["SUN"],
    };
  }

  // -----------------------
  // TEXT → SPEECH (DEMO)
  // -----------------------
  async textToSpeech(_: string): Promise<string | null> {
    await this.delay(500);
    return null;
  }

  // -----------------------
  // DOCTOR: FETCH SYNC PACKETS
  // -----------------------
  async fetchSyncPackets(specialty?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (specialty) params.append("specialty", specialty);

      const response = await fetch(
        `${API_BASE}/api/fetch-sync-packets?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.packets || [];
    } catch (error) {
      console.error("❌ Fetch sync packets failed:", error);
      return [];
    }
  }

  // -----------------------
  // DOCTOR: MARK PACKET DONE
  // -----------------------
  async markPacketProcessed(
    packetId: string,
    doctorId?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/mark-packet-processed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packetId, doctorId }),
      });

      return response.ok;
    } catch (error) {
      console.error("❌ Mark packet processed failed:", error);
      return false;
    }
  }

  // =======================
  // Utilities
  // =======================

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =======================
// Export Singleton
// =======================

export const processingService = new ProcessingService();
