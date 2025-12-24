import React, { useState, useEffect } from "react";
import {
  Activity,
  User,
  Stethoscope,
  CheckCircle2,
  Wifi,
  Loader2,
  Volume2,
  Pill,
} from "lucide-react";
import {
  getCasesByPatient,
  MedicalCase,
  DoctorReply,
} from "../services/medicalCasesService";

interface SymptomDisplayProps {
  patientId: string;
  onPlayVoice?: (text: string) => void;
  isPlaying?: string | null;
}

/**
 * SymptomDisplay Component
 * ========================
 * Displays symptom-only cases from unified medicalCases storage.
 * Auto-refreshes every 3 seconds to show doctor replies in real-time.
 * Each symptom case includes:
 * - Symptom text submitted by patient
 * - All doctor replies linked to same caseId
 * - Timestamps for both submission and replies
 */
export const SymptomDisplay: React.FC<SymptomDisplayProps> = ({
  patientId,
  onPlayVoice,
  isPlaying,
}) => {
  const [cases, setCases] = useState<MedicalCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-refresh cases every 3 seconds to show doctor replies in real-time
  useEffect(() => {
    const loadCases = () => {
      try {
        const patientCases = getCasesByPatient(patientId);
        // Filter to only symptom cases (those with symptomText)
        const symptomCases = patientCases.filter((c) => c.symptomText);
        setCases(symptomCases);
        setLoading(false);
      } catch (error) {
        console.error("❌ Failed to load symptom cases:", error);
        setLoading(false);
      }
    };

    loadCases();

    // Set up auto-refresh interval
    const interval = setInterval(loadCases, 3000);
    return () => clearInterval(interval);
  }, [patientId]);

  if (loading) {
    return (
      <div className="text-center py-8 bg-white rounded-[40px] border border-slate-100">
        <Loader2 className="animate-spin mx-auto text-indigo-600" size={32} />
        <p className="text-slate-400 text-xs font-bold mt-2">
          Loading symptoms...
        </p>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-[40px] border border-slate-100 shadow-sm">
        <User className="mx-auto mb-4 text-slate-200" size={48} />
        <p className="text-slate-400 text-xs font-bold">
          No symptoms recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cases
        .slice()
        .reverse()
        .map((medicalCase) => (
          <div key={medicalCase.caseId} className="space-y-3">
            {/* SYMPTOM SUBMISSION CARD */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
              <div className="flex items-start gap-6">
                <div className="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white p-4 rounded-3xl transition-colors flex-shrink-0">
                  <Activity size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* HEADER WITH TIMESTAMP */}
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(medicalCase.createdAt).toLocaleDateString()} •{" "}
                      {new Date(medicalCase.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">
                      <Activity size={10} /> Symptom
                    </div>
                  </div>

                  {/* SYMPTOM TEXT */}
                  <p className="text-slate-900 font-bold text-lg mb-4 leading-snug break-words">
                    "{medicalCase.symptomText}"
                  </p>

                  {/* PLAY VOICE BUTTON */}
                  {onPlayVoice && (
                    <button
                      onClick={() => onPlayVoice(medicalCase.symptomText!)}
                      className="flex items-center gap-3 text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-6 py-3 rounded-2xl transition-all hover:bg-indigo-100 active:scale-95"
                    >
                      {isPlaying === medicalCase.caseId ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Volume2 size={16} />
                      )}
                      Play Symptom
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* DOCTOR REPLIES FOR THIS SYMPTOM */}
            {medicalCase.replies && medicalCase.replies.length > 0 && (
              <div className="ml-4 space-y-3 border-l-4 border-emerald-200 pl-4">
                {medicalCase.replies
                  .slice()
                  .reverse()
                  .map((reply) => (
                    <div
                      key={reply.replyId}
                      className="bg-emerald-50 rounded-[40px] p-6 border border-emerald-100 shadow-sm transition-all hover:shadow-md hover:border-emerald-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl flex-shrink-0">
                          {reply.type === "PRESCRIPTION" ? (
                            <Pill size={20} />
                          ) : (
                            <Stethoscope size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* DOCTOR INFO */}
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <div>
                              <p className="text-sm font-bold text-emerald-900">
                                {reply.doctorName || "Doctor"}
                              </p>
                              <p className="text-[10px] text-emerald-600 uppercase tracking-wider">
                                {reply.specialization || "General Medicine"}
                              </p>
                            </div>
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                              {new Date(reply.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* DOCTOR MESSAGE */}
                          <p className="text-slate-800 text-sm font-semibold mb-3 break-words">
                            {reply.content}
                          </p>

                          {/* MEDICATION (if prescription) */}
                          {reply.medication && (
                            <div className="bg-white rounded-2xl p-3 border border-emerald-100 mb-2">
                              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-1">
                                Medication Prescribed
                              </p>
                              <p className="text-sm font-bold text-slate-900">
                                {reply.medication}
                              </p>
                            </div>
                          )}

                          {/* REPLY TYPE BADGE */}
                          <div className="flex items-center gap-1.5 bg-white text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-emerald-100 w-fit">
                            <CheckCircle2 size={10} /> {reply.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* NO REPLIES YET MESSAGE */}
            {(!medicalCase.replies || medicalCase.replies.length === 0) && (
              <div className="ml-4 bg-amber-50 rounded-[40px] p-6 border border-amber-100 border-dashed">
                <div className="flex items-center gap-3">
                  <Wifi size={16} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Waiting for doctor response...
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default SymptomDisplay;
