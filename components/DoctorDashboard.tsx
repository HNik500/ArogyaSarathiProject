import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  MessageCircle,
  Pill,
  Send,
  Eye,
  Loader2,
} from 'lucide-react';
import {
  getAllCases,
  getCaseById,
  addDoctorReply,
  MedicalCase,
} from '../services/medicalCasesService';
import { getImageUrl } from '../utils/imageConverterFixed';

interface DoctorDashboardProps {
  doctorId: string;
  doctorName: string;
  specialization: string;
  clinicId: string;
}

/**
 * DOCTOR DASHBOARD COMPONENT
 * 
 * This component allows doctors to:
 * 1. See all medical cases (from shared localStorage key)
 * 2. View images uploaded by patients (stored as Base64)
 * 3. Send replies (prescriptions or notes)
 * 4. Replies are saved to same case object
 * 
 * Root cause fix:
 * - ✅ Uses 'medicalCases' shared key (not patient-specific)
 * - ✅ Can see Base64 images stored by patient
 * - ✅ Replies update same case, patient sees them
 */
export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctorId,
  doctorName,
  specialization,
  clinicId,
}) => {
  const [allCases, setAllCases] = useState<MedicalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<MedicalCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyType, setReplyType] = useState<'PRESCRIPTION' | 'DOCTOR_NOTE'>(
    'DOCTOR_NOTE'
  );
  const [medication, setMedication] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load all cases on component mount
  useEffect(() => {
    refreshCases();

    // Refresh every 5 seconds to catch patient updates
    const interval = setInterval(refreshCases, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshCases = () => {
    console.log('🔄 Refreshing cases...');
    const cases = getAllCases();
    setAllCases(cases);

    // If currently viewing a case, update it
    if (selectedCase) {
      const updated = getCaseById(selectedCase.caseId);
      if (updated) {
        setSelectedCase(updated);
      }
    }
  };

  const handleSelectCase = (medicalCase: MedicalCase) => {
    setSelectedCase(medicalCase);
    setReplyContent('');
    setMedication('');
    setSuccessMessage(null);
  };

  const handleSendReply = async () => {
    if (!selectedCase || (!replyContent.trim() && replyType === 'DOCTOR_NOTE')) {
      alert('Please enter a message');
      return;
    }

    if (replyType === 'PRESCRIPTION' && !medication.trim()) {
      alert('Please enter medication details');
      return;
    }

    setSubmitting(true);

    try {
      // ✅ Add reply to the case in localStorage
      const updatedCase = addDoctorReply(
        selectedCase.caseId,
        doctorId,
        doctorName,
        specialization,
        replyContent || medication,
        replyType,
        medication
      );

      if (updatedCase) {
        // Update local state
        setSelectedCase(updatedCase);
        setReplyContent('');
        setMedication('');
        setSuccessMessage(`✅ ${replyType} sent to patient!`);

        // Refresh cases list
        refreshCases();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!selectedCase ? (
        // CASES LIST VIEW
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-slate-900">
              📋 Medical Cases Queue
            </h2>
            <button
              onClick={refreshCases}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500 px-2 space-y-1">
            <p>
              👨‍⚕️ Doctor: <span className="text-slate-700">{doctorName}</span>
            </p>
            <p>
              🏥 Specialty:{' '}
              <span className="text-slate-700">{specialization}</span>
            </p>
            <p>
              🏢 Clinic ID: <span className="text-slate-700">{clinicId}</span>
            </p>
          </div>

          {allCases.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 text-center">
              <MessageCircle size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">
                No medical cases yet. Waiting for patient uploads...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allCases
                .slice()
                .reverse()
                .map((medicalCase) => (
                  <button
                    key={medicalCase.caseId}
                    onClick={() => handleSelectCase(medicalCase)}
                    className="bg-white rounded-[32px] p-6 border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all text-left group active:scale-95"
                  >
                    <div className="space-y-4">
                      {/* Case Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                            Patient: {medicalCase.patientName}
                          </p>
                          <p className="text-xs font-bold text-slate-500">
                            {medicalCase.patientAge}y • {medicalCase.patientDistrict},
                            {medicalCase.patientState}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ml-2 ${
                            medicalCase.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : medicalCase.status === 'REVIEWED'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {medicalCase.status}
                        </span>
                      </div>

                      {/* Images Preview */}
                      {medicalCase.images.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-2">
                            📸 {medicalCase.images.length} image
                            {medicalCase.images.length !== 1 ? 's' : ''}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {medicalCase.images.slice(0, 2).map((image) => (
                              <div
                                key={image.imageId}
                                className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200"
                              >
                                <img
                                  src={getImageUrl(image.base64Data)}
                                  alt={image.filename}
                                  className="w-full h-16 object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Replies Count */}
                      {medicalCase.replies.length > 0 && (
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-700">
                            ✅ {medicalCase.replies.length} reply
                            {medicalCase.replies.length !== 1 ? 'ies' : ''}
                          </p>
                        </div>
                      )}

                      {/* View Button */}
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm group-hover:gap-3 transition-all">
                        <Eye size={16} />
                        <span>View Case</span>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      ) : (
        // CASE DETAIL VIEW
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedCase(null);
              setReplyContent('');
              setMedication('');
            }}
            className="flex items-center gap-2 text-slate-600 font-black uppercase text-xs hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Cases
          </button>

          {/* Case Header */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Patient Information
                  </p>
                  <h3 className="text-3xl font-black text-slate-900">
                    {selectedCase.patientName}
                  </h3>
                  <div className="text-sm font-bold text-slate-600 mt-2 space-y-1">
                    <p>📱 {selectedCase.patientPhone}</p>
                    <p>
                      📍 {selectedCase.patientDistrict},{' '}
                      {selectedCase.patientState}
                    </p>
                    <p>🎂 Age: {selectedCase.patientAge} years</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider ${
                    selectedCase.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : selectedCase.status === 'REVIEWED'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedCase.status}
                </span>
              </div>

              {/* Case ID */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Case ID
                </p>
                <p className="font-bold text-slate-700 mt-1 font-mono text-sm">
                  {selectedCase.caseId}
                </p>
              </div>
            </div>
          </div>

          {/* Symptom Text Section (if symptom-only case) */}
          {selectedCase.symptomText && (
            <div className="bg-indigo-50 rounded-[40px] p-10 border border-indigo-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6">
                🏥 Patient Symptom Description
              </h3>
              <div className="bg-white rounded-2xl p-6 border border-indigo-200">
                <p className="text-slate-800 text-lg font-medium leading-relaxed">
                  "{selectedCase.symptomText}"
                </p>
                <p className="text-xs font-bold text-slate-500 mt-4">
                  Submitted: {new Date(selectedCase.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Images Section */}
          {selectedCase.images.length > 0 && (
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6">
                📸 Medical Images ({selectedCase.images.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedCase.images.map((image) => (
                  <div
                    key={image.imageId}
                    className="space-y-3"
                  >
                    <img
                      src={getImageUrl(image.base64Data)}
                      alt={image.filename}
                      className="w-full rounded-2xl border border-slate-200 object-cover max-h-96"
                    />
                    <div className="text-xs font-bold text-slate-500 space-y-1">
                      <p>📄 {image.filename}</p>
                      <p>
                        ⏰{' '}
                        {new Date(image.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Replies */}
          {selectedCase.replies.length > 0 && (
            <div className="bg-white rounded-[40px] p-10 border border-emerald-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6">
                ✅ Previous Replies ({selectedCase.replies.length})
              </h3>

              <div className="space-y-4">
                {selectedCase.replies
                  .slice()
                  .reverse()
                  .map((reply) => (
                    <div
                      key={reply.replyId}
                      className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-emerald-900">
                            {reply.doctorName}
                          </p>
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                            {reply.specialization}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                          {reply.type}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-emerald-800 mb-3">
                        {reply.content}
                      </p>

                      {reply.medication && (
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 mb-3">
                          <p className="text-xs font-bold text-slate-500 mb-1">
                            💊 Medication:
                          </p>
                          <p className="text-sm font-bold text-slate-700">
                            {reply.medication}
                          </p>
                        </div>
                      )}

                      <p className="text-xs font-bold text-emerald-600">
                        ⏰ {new Date(reply.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Send Reply Form */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900">
              💬 Send Reply to Patient
            </h3>

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-emerald-700">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Reply Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Reply Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setReplyType('DOCTOR_NOTE');
                    setMedication('');
                  }}
                  className={`py-4 px-6 rounded-2xl font-bold uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${
                    replyType === 'DOCTOR_NOTE'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <MessageCircle size={18} />
                  Doctor Note
                </button>
                <button
                  onClick={() => setReplyType('PRESCRIPTION')}
                  className={`py-4 px-6 rounded-2xl font-bold uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${
                    replyType === 'PRESCRIPTION'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Pill size={18} />
                  Prescription
                </button>
              </div>
            </div>

            {/* Reply Content */}
            {replyType === 'DOCTOR_NOTE' ? (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Doctor's Note
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your clinical notes here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-slate-400 outline-none resize-none h-24"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Medication Details
                  </label>
                  <input
                    type="text"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    placeholder="Drug name, dosage, frequency..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-slate-400 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Instructions/Notes
                  </label>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Special instructions or additional notes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-slate-400 outline-none resize-none h-24"
                  />
                </div>
              </>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendReply}
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-4 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Send to Patient
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;

/**
 * USAGE IN DOCTOR VIEW:
 * ====================
 * 
 * if (userRole === 'DOCTOR' && doctorProfile) {
 *   return (
 *     <DoctorDashboard
 *       doctorId={doctorProfile.id}
 *       doctorName={doctorProfile.name}
 *       specialization={doctorProfile.specialization}
 *       clinicId={doctorProfile.clinicId}
 *     />
 *   );
 * }
 * 
 * KEY FIXES:
 * ==========
 * 1. ✅ getAllCases() reads from shared 'medicalCases' key
 * 2. ✅ Doctor sees ALL cases (not role-specific)
 * 3. ✅ Images displayed via getImageUrl() (proper Base64 formatting)
 * 4. ✅ addDoctorReply() updates same case object
 * 5. ✅ Patient refreshes and sees doctor's reply
 * 
 * DATA FLOW:
 * ==========
 * Patient login → Upload image → createMedicalCase()
 *   ↓
 *   Saved to localStorage['medicalCases']
 *   ↓
 * Doctor login → getAllCases() → Sees patient's image
 *   ↓
 *   Writes reply → addDoctorReply()
 *   ↓
 *   Same case object updated in localStorage['medicalCases']
 *   ↓
 * Patient refreshes → getCasesByPatient() → Sees doctor's reply
 */
