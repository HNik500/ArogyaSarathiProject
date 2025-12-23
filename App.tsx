import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Database,
  User,
  Stethoscope,
  Mic,
  CloudOff,
  CloudLightning,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ClipboardList,
  Wifi,
  History,
  ShoppingBag,
  MessageCircle,
  Check,
  ChevronRight,
  Volume2,
  Languages,
  Sun,
  Moon,
  Utensils,
  Camera,
  Video,
  Activity,
  ArrowUpCircle,
  Info,
  FileWarning,
  RefreshCw,
  Clock,
  Send,
  Search,
  LogOut,
  ShieldCheck,
  UserCircle,
  Building2,
  MapPin,
  BadgeCheck,
  ArrowLeft,
  Users,
  ArrowRight,
  Square,
  Loader2,
  Type as TypeIcon,
  AlertTriangle,
  Pill,
  ShoppingCart,
} from "lucide-react";
import {
  ConnectivityState,
  PatientVault,
  MedicalRecord,
  SyncPacket,
  PharmacyOrder,
  UserRole,
  PatientProfile,
  DoctorProfile,
  PharmacyProfile,
  SupportedLanguage,
  DemoPatientProfile,
} from "./types";
import { ConnectivitySim } from "./components/ConnectivitySim";
import EmergencyHospitalFinder from "./components/EmergencyHospitalFinder";
import MedicineReminder from "./components/MedicineReminder";
import MedicineOrdering from "./components/MedicineOrdering";
import { processingService } from "./services/processingService";
import { reminderService } from "./services/reminderService";

const STATE_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  Telangana: "Telugu",
  "Andhra Pradesh": "Telugu",
  Maharashtra: "Marathi",
  Karnataka: "Kannada",
  "West Bengal": "Bengali",
  "Tamil Nadu": "Tamil",
  Bihar: "Hindi",
  "Uttar Pradesh": "Hindi",
  "Madhya Pradesh": "Hindi",
  Rajasthan: "Hindi",
  Gujarat: "English",
  Kerala: "English",
};

// Utility functions for patient data isolation
const generatePatientId = (
  name: string,
  age: number,
  location: string
): string => {
  const sanitized = `${name}_${age}_${location}`.replace(/[^a-zA-Z0-9]/g, "_");
  return `PAT-${sanitized.toUpperCase()}`;
};

const getPatientStorageKey = (
  patientId: string,
  dataType: "vault" | "syncPool"
): string => {
  return `hv_${dataType}_${patientId}`;
};

const PATIENTS_STORAGE_KEY = "patients";
const ACTIVE_PATIENT_STORAGE_KEY = "activePatient";
const LANGUAGE_PREF_KEY = "hv_language_pref";
const LANGUAGE_CODE_MAP: Record<string, string> = {
  English: "en",
  Telugu: "te",
  Hindi: "hi",
  Tamil: "ta",
  Kannada: "kn",
};

const loadPatientsFromStorage = (): PatientProfile[] => {
  try {
    const primary = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (primary) return JSON.parse(primary);

    const legacy = localStorage.getItem("hv_patient_profiles");
    return legacy ? JSON.parse(legacy) : [];
  } catch (error) {
    console.error("❌ Failed to load patients from storage", error);
    return [];
  }
};

const savePatientsToStorage = (patients: PatientProfile[]) => {
  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
    // Keep legacy keys in sync to avoid regressions
    localStorage.setItem("hv_patient_profiles", JSON.stringify(patients));
  } catch (error) {
    console.error("❌ Failed to save patients to storage", error);
  }
};

const loadActivePatientFromStorage = (): PatientProfile | null => {
  try {
    const primary = localStorage.getItem(ACTIVE_PATIENT_STORAGE_KEY);
    if (primary) return JSON.parse(primary);

    const legacyCurrent = localStorage.getItem("hv_current_patient_profile");
    if (legacyCurrent) return JSON.parse(legacyCurrent);

    const legacyProfile = localStorage.getItem("hv_patient_profile");
    return legacyProfile ? JSON.parse(legacyProfile) : null;
  } catch (error) {
    console.error("❌ Failed to load active patient from storage", error);
    return null;
  }
};

const saveActivePatientToStorage = (patient: PatientProfile | null) => {
  try {
    if (patient) {
      localStorage.setItem(ACTIVE_PATIENT_STORAGE_KEY, JSON.stringify(patient));
      // Keep legacy keys in sync to avoid regressions
      localStorage.setItem("hv_current_patient_profile", JSON.stringify(patient));
      localStorage.setItem("hv_patient_profile", JSON.stringify(patient));
    } else {
      localStorage.removeItem(ACTIVE_PATIENT_STORAGE_KEY);
      localStorage.removeItem("hv_current_patient_profile");
      localStorage.removeItem("hv_patient_profile");
    }
  } catch (error) {
    console.error("❌ Failed to save active patient to storage", error);
  }
};

// Lightweight translation helper (best effort, non-blocking)
const translateText = async (
  text: string,
  targetLanguage: string
): Promise<string> => {
  // Skip if already English or empty
  if (!text || targetLanguage === "English") return text;
  const targetCode = LANGUAGE_CODE_MAP[targetLanguage] || null;
  if (!targetCode) return text;
  const endpoints = [
    "https://libretranslate.de/translate",
    "https://translate.argosopentech.com/translate",
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: "auto",
          target: targetCode,
          format: "text",
          api_key: "",
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.translatedText) return data.translatedText;
    } catch (error) {
      console.warn(`⚠️ Translation failed on ${url}, falling back`, error);
    }
  }
  return text;
};

const IconDisplay: React.FC<{ type: "SUN" | "MOON" | "FOOD" }> = ({ type }) => {
  switch (type) {
    case "SUN":
      return (
        <div
          title="Morning"
          className="bg-amber-100 text-amber-600 p-2 rounded-lg border border-amber-200"
        >
          <Sun size={14} />
        </div>
      );
    case "MOON":
      return (
        <div
          title="Night"
          className="bg-blue-100 text-blue-600 p-2 rounded-lg border border-blue-200"
        >
          <Moon size={14} />
        </div>
      );
    case "FOOD":
      return (
        <div
          title="With Food"
          className="bg-emerald-100 text-emerald-600 p-2 rounded-lg border border-emerald-200"
        >
          <Utensils size={14} />
        </div>
      );
    default:
      return null;
  }
};

const App: React.FC = () => {
  // Role & Onboarding State
  const [userRole, setUserRole] = useState<UserRole | null>(
    () => (localStorage.getItem("hv_user_role") as UserRole) || null
  );
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(
    () => loadActivePatientFromStorage()
  );
  const [isAddingNewPatient, setIsAddingNewPatient] = useState(false);
  const [availablePatients, setAvailablePatients] = useState<PatientProfile[]>(
    () => loadPatientsFromStorage()
  );
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(
    () => {
      const s = localStorage.getItem("hv_doctor_profile");
      return s ? JSON.parse(s) : null;
    }
  );
  const [pharmacyProfile, setPharmacyProfile] =
    useState<PharmacyProfile | null>(() => {
      const s = localStorage.getItem("hv_pharmacy_profile");
      return s ? JSON.parse(s) : null;
    });
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    () => localStorage.getItem(LANGUAGE_PREF_KEY) || "English"
  );

  const [network, setNetwork] = useState<ConnectivityState>(
    ConnectivityState.OFFLINE
  );

  // Data State - Initialize as empty, load after patient selection
  const [vault, setVault] = useState<PatientVault>({
    patientId: "",
    name: "",
    age: 0,
    location: "",
    state: "",
    language: "English",
    phoneNumber: "",
    houseNumber: "",
    streetVillage: "",
    district: "",
    records: [],
  });

  const [syncPool, setSyncPool] = useState<SyncPacket[]>([]);

  const [orders, setOrders] = useState<PharmacyOrder[]>(() => {
    const saved = localStorage.getItem("pharmacy_orders");
    return saved ? JSON.parse(saved) : [];
  });

  // UI State
  const [isRecordingUI, setIsRecordingUI] = useState(false);
  const [isVoiceCapturing, setIsVoiceCapturing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [newSymptom, setNewSymptom] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCase, setActiveCase] = useState<SyncPacket | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const [doctorMedInput, setDoctorMedInput] = useState("");
  const [doctorNoteInput, setDoctorNoteInput] = useState("");
  const [showEmergencyHospitalFinder, setShowEmergencyHospitalFinder] =
    useState(false);
  const [showMedicineReminder, setShowMedicineReminder] = useState(false);
  const [showMedicineOrdering, setShowMedicineOrdering] = useState(false);
  const [activePatientTab, setActivePatientTab] = useState<
    "symptoms" | "responses" | "emergency"
  >("symptoms");
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [whatsappNotify, setWhatsappNotify] = useState<string | null>(null);
  const [backendMessages, setBackendMessages] = useState<any[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sync Persistence - Patient-specific storage
  useEffect(() => {
    if (patientProfile) {
      const syncKey = getPatientStorageKey(
        patientProfile.patientId,
        "syncPool"
      );
      localStorage.setItem(syncKey, JSON.stringify(syncPool));
      console.log("💾 Sync pool saved for patient:", patientProfile.patientId);
    }
  }, [syncPool, patientProfile]);

  useEffect(() => {
    if (patientProfile) {
      const vaultKey = getPatientStorageKey(patientProfile.patientId, "vault");
      localStorage.setItem(vaultKey, JSON.stringify(vault));
      console.log("💾 Vault saved for patient:", patientProfile.patientId);
    }
  }, [vault, patientProfile]);

  // Patient profiles management - Enhanced for better persistence
  useEffect(() => {
    if (patientProfile) {
      // Save current patient profile separately for easy restoration
      saveActivePatientToStorage(patientProfile);
      console.log("💾 Current patient profile saved:", patientProfile.name);

      // Update available patients list
      const updatedPatients = availablePatients.map((p) =>
        p.patientId === patientProfile.patientId ? patientProfile : p
      );

      // If patient doesn't exist in availablePatients, add them
      if (
        !availablePatients.find((p) => p.patientId === patientProfile.patientId)
      ) {
        updatedPatients.push(patientProfile);
      }

      savePatientsToStorage(updatedPatients);
      console.log("💾 Patient profiles list updated:", updatedPatients.length);
    }
  }, [availablePatients, patientProfile]);

  // Initialize patient profile from localStorage on app startup
  useEffect(() => {
    if (userRole === "PATIENT" && !patientProfile) {
      console.log("🔄 Initializing patient session...");

      const storedPatients = loadPatientsFromStorage();
      const storedActive = loadActivePatientFromStorage();

      if (storedPatients.length > 0) {
        console.log("✅ Restored patient profiles list:", storedPatients.length);
        setAvailablePatients(storedPatients);
      }

      if (storedActive && !isAddingNewPatient) {
        console.log("✅ Restored active patient:", storedActive.name);
        setPatientProfile(storedActive);
      } else if (storedPatients.length > 0 && !isAddingNewPatient) {
        console.log("🔄 Auto-selecting first available patient");
        setPatientProfile(storedPatients[0]);
      } else {
        console.log(
          "📝 No patient data found - will require patient onboarding"
        );
      }
    }
  }, [userRole, patientProfile, isAddingNewPatient]);

  // Function to fetch messages from backend
  const fetchPatientMessages = useCallback(async () => {
    if (!patientProfile) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/get-patient-messages?patientId=${patientProfile.patientId}`
      );
      if (response.ok) {
        const data = await response.json();
        setBackendMessages(data.messages || []);
        console.log("📨 Fetched backend messages:", data.messages?.length || 0);
      }
    } catch (error) {
      console.error("❌ Failed to fetch patient messages:", error);
    }
  }, [patientProfile]);

  // Load patient data when patient profile changes
  useEffect(() => {
    if (patientProfile) {
      console.log("📂 Loading data for patient:", patientProfile.patientId);

      // Load vault data
      const vaultKey = getPatientStorageKey(patientProfile.patientId, "vault");
      const savedVault = localStorage.getItem(vaultKey);
      if (savedVault) {
        setVault(JSON.parse(savedVault));
      } else {
        // Initialize with patient profile data (include all fields for doctor view)
        setVault({
          patientId: patientProfile.patientId,
          name: patientProfile.name,
          age: patientProfile.age,
          location: patientProfile.location,
          state: patientProfile.state,
          language: patientProfile.language,
          phoneNumber: patientProfile.phoneNumber,
          houseNumber: patientProfile.houseNumber,
          streetVillage: patientProfile.streetVillage,
          district: patientProfile.district,
          records: [],
        });
      }

      // Load sync pool data
      const syncKey = getPatientStorageKey(
        patientProfile.patientId,
        "syncPool"
      );
      const savedSync = localStorage.getItem(syncKey);
      if (savedSync) {
        setSyncPool(JSON.parse(savedSync));
      }

      // Fetch messages from backend
      fetchPatientMessages();

      // Initialize medicine reminders for this patient
      reminderService.startReminderChecks(patientProfile.patientId);

      console.log("✅ Patient data loaded for:", patientProfile.name);
    }
  }, [patientProfile, fetchPatientMessages]);

  // Complete logout function with session reset
  const handleLogout = useCallback(() => {
    console.log("🚪 Logging out and clearing all session data");

    // Stop background services first
    if (patientProfile) {
      reminderService.stopAllReminderChecks();
      console.log(
        "🛑 Stopped reminder service for patient:",
        patientProfile.patientId
      );
    }

    // Clear patient-specific data
    if (patientProfile) {
      const patientKeysToRemove = [
        getPatientStorageKey(patientProfile.patientId, "vault"),
        getPatientStorageKey(patientProfile.patientId, "syncPool"),
      ];
      patientKeysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        console.log("🗑️ Removed patient data key:", key);
      });
    }

    // Clear all Arogya Sarathi-related global data
    const keysToRemove = [
      "hv_patient_profiles",
      "hv_user_role",
      "hv_patient_profile",
      "hv_doctor_profile",
      "hv_pharmacy_profile",
    ];
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log("🗑️ Removed global data key:", key);
    });

    // Clear all other Arogya Sarathi keys as backup
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("hv_")) {
        localStorage.removeItem(key);
        console.log("🗑️ Removed backup Arogya Sarathi key:", key);
      }
    }

    // Clear all patient-related state
    setPatientProfile(null);
    setVault({
      patientId: "",
      name: "",
      age: 0,
      location: "",
      state: "",
      language: "English",
      phoneNumber: "",
      houseNumber: "",
      streetVillage: "",
      district: "",
      records: [],
    });
    setSyncPool([]);
    setAvailablePatients([]);
    setDoctorProfile(null);
    setPharmacyProfile(null);

    // Reset UI states
    setActiveCase(null);
    setDoctorMedInput("");
    setDoctorNoteInput("");
    setIsPlaying(null);
    setNewSymptom("");
    setIsRecordingUI(false);
    setIsVoiceCapturing(false);
    setIsTranscribing(false);
    setActivePatientTab("symptoms");
    setShowPatientSelector(false);
    setShowEmergencyHospitalFinder(false);
    setShowMedicineReminder(false);
    setShowMedicineOrdering(false);

    // Clear session storage
    sessionStorage.clear();

    // Reset user role
    setUserRole(null);

    console.log("✅ Complete logout and session reset completed");
  }, [patientProfile]);

  // Clear current patient data for switching
  const clearCurrentPatientData = useCallback(() => {
    console.log("🧹 Clearing current patient data");
    setVault({
      patientId: "",
      name: "",
      age: 0,
      location: "",
      state: "",
      language: "English",
      phoneNumber: "",
      houseNumber: "",
      streetVillage: "",
      district: "",
      records: [],
    });
    setSyncPool([]);

    // Reset UI states
    setActiveCase(null);
    setDoctorMedInput("");
    setDoctorNoteInput("");
    setIsPlaying(null);
    setNewSymptom("");
    setIsRecordingUI(false);
    setIsVoiceCapturing(false);
    setIsTranscribing(false);
    setActivePatientTab("symptoms");
  }, []);

  // Patient switching function
  const handlePatientSwitch = useCallback(
    (selectedPatient: PatientProfile | null) => {
      if (selectedPatient) {
        // Switching to existing patient
        console.log("🔄 Switching to patient:", selectedPatient.patientId);
        console.log("Current patients available:", availablePatients.length);

        // Clear old data first
        clearCurrentPatientData();

        // Switch to new patient
        setPatientProfile(selectedPatient);
        setShowPatientSelector(false);
        setIsAddingNewPatient(false);
        saveActivePatientToStorage(selectedPatient);

        // Data will be loaded automatically by the useEffect above
        console.log("✅ Patient switch initiated for:", selectedPatient.name);
      } else {
        // Adding new patient - clear selector and let PatientOnboarding handle it
        console.log("🔄 Initiating new patient onboarding");
        setShowPatientSelector(false);
        setIsAddingNewPatient(true);
        setPatientProfile(null);
        saveActivePatientToStorage(null);
        // The PatientOnboarding will be shown automatically when patientProfile is null
        console.log("✅ New patient onboarding initiated");
      }
    },
    [availablePatients, clearCurrentPatientData]
  );

  // Optional helper to clear demo/local patient data for quick resets
  const clearDemoData = useCallback(() => {
    console.log("🧹 Clearing demo patient data");
    clearCurrentPatientData();
    setAvailablePatients([]);
    setPatientProfile(null);
    setIsAddingNewPatient(false);
    savePatientsToStorage([]);
    saveActivePatientToStorage(null);
    setShowPatientSelector(false);
  }, [clearCurrentPatientData]);

  const openPatientPortal = useCallback(() => {
    const latestPatients = loadPatientsFromStorage();
    if (latestPatients.length > 0) {
      setAvailablePatients(latestPatients);
    }
    setIsAddingNewPatient(false);
    setShowPatientSelector(true);
  }, []);
  useEffect(
    () => localStorage.setItem("pharmacy_orders", JSON.stringify(orders)),
    [orders]
  );

  // Persist language preference and reset translations when changed
  useEffect(() => {
    localStorage.setItem(LANGUAGE_PREF_KEY, selectedLanguage);
    setTranslations({});
  }, [selectedLanguage]);

  useEffect(() => {
    if (userRole) localStorage.setItem("hv_user_role", userRole);
    if (patientProfile)
      localStorage.setItem(
        "hv_patient_profile",
        JSON.stringify(patientProfile)
      );
    if (doctorProfile)
      localStorage.setItem("hv_doctor_profile", JSON.stringify(doctorProfile));
    if (pharmacyProfile)
      localStorage.setItem(
        "hv_pharmacy_profile",
        JSON.stringify(pharmacyProfile)
      );
  }, [userRole, patientProfile, doctorProfile, pharmacyProfile]);

  // Keep patient lists persisted for both new and legacy keys
  useEffect(() => {
    savePatientsToStorage(availablePatients);
  }, [availablePatients]);

  const requestTranslation = useCallback(
    async (key: string, original: string) => {
      if (!original || selectedLanguage === "English" || translations[key]) return;
      const translated = await translateText(original, selectedLanguage);
      setTranslations((prev) => ({
        ...prev,
        [key]: translated,
      }));
    },
    [selectedLanguage, translations]
  );

  const getDisplayText = useCallback(
    (key: string, original: string) => {
      if (!original) return { primary: "", secondary: null as string | null };
      if (selectedLanguage === "English") {
        return { primary: original, secondary: null as string | null };
      }
      const cached = translations[key];
      if (!cached) {
        // Fire and forget translation; fallback to original
        requestTranslation(key, original);
        return { primary: original, secondary: original };
      }
      if (cached === original) {
        return { primary: original, secondary: null as string | null };
      }
      return { primary: cached, secondary: original };
    },
    [requestTranslation, selectedLanguage, translations]
  );

  // Network Handlers
  useEffect(() => {
    const handleOnline = () => setNetwork(ConnectivityState.ONLINE);
    const handleOffline = () => setNetwork(ConnectivityState.OFFLINE);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Background Sync Logic - send to backend for storage
  const triggerSync = useCallback(async () => {
    if (isSyncing || userRole !== "PATIENT") return;

    const pendingRecords = vault.records.filter((r) => r.status === "PENDING");
    if (pendingRecords.length === 0) return;

    console.log(
      "🔄 Triggering sync with",
      pendingRecords.length,
      "pending records"
    );
    setIsSyncing(true);

    try {
      const visualRecords = pendingRecords.filter(
        (r) => r.type === "VISUAL_TRIAGE" && r.media
      );
      let visualSummary = "";

      if (visualRecords.length > 0) {
        console.log("📷 Processing visual triage data");
        const triage = await processingService.triageVisualData(
          visualRecords[0].media!.lowResData
        );
        visualSummary = `[Triage Analysis: ${triage.findings}]`;

        setVault((prev) => ({
          ...prev,
          records: prev.records.map((r) =>
            r.id === visualRecords[0].id
              ? {
                  ...r,
                  media: { ...r.media!, analysis: triage.findings },
                  severity: triage.urgency as any,
                }
              : r
          ),
        }));
      }

      const symptomsText = pendingRecords
        .filter((r) => r.type === "SYMPTOM")
        .map((r) => r.content)
        .join(", ");

      console.log("🩺 Symptoms to sync:", symptomsText);

      if (symptomsText && patientProfile) {
        // Ensure vault has complete patient data before syncing
        const completeVault = {
          ...vault,
          patientId: patientProfile.patientId,
          name: patientProfile.name,
          age: patientProfile.age,
          location: patientProfile.location,
          state: patientProfile.state,
          language: patientProfile.language,
          phoneNumber: patientProfile.phoneNumber,
          houseNumber: patientProfile.houseNumber,
          streetVillage: patientProfile.streetVillage,
          district: patientProfile.district,
        };

        console.log("📦 Creating sync packet with real patient data:", {
          patientName: patientProfile.name,
          patientAge: patientProfile.age,
          patientLocation: patientProfile.location,
        });

        const delta = await processingService.generateDeltaSync(
          completeVault,
          symptomsText
        );

        console.log("✅ Delta sync sent to backend:", delta);

        // Note: sync packets are now stored in backend, not locally
        // Doctors will fetch them from the backend
      }

      setVault((prev) => ({
        ...prev,
        records: prev.records.map((r) =>
          r.status === "PENDING" ? { ...r, status: "SYNCED" } : r
        ),
      }));

      console.log("✅ Sync completed successfully");
    } catch (error) {
      console.error("❌ Sync interrupted:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 2000);
    }
  }, [
    network,
    vault.records,
    isSyncing,
    userRole,
    vault.name,
    vault.location,
    vault.state,
  ]);

  // Doctor: Fetch sync packets from backend
  useEffect(() => {
    if (userRole === "DOCTOR" && doctorProfile) {
      const fetchPackets = async () => {
        try {
          // Pull all packets and highlight matches locally so doctors don't miss cross-specialty cases
          const packets = await processingService.fetchSyncPackets();
          setSyncPool(packets);
          console.log(
            `📡 Fetched ${packets.length} sync packets for ${doctorProfile.specialization}`
          );
        } catch (error) {
          console.error("Failed to fetch sync packets:", error);
        }
      };

      // Initial fetch
      fetchPackets();

      // Poll every 10 seconds for new packets
      const interval = setInterval(fetchPackets, 10000);
      return () => clearInterval(interval);
    }
  }, [userRole, doctorProfile]);

  useEffect(() => {
    if (network !== ConnectivityState.OFFLINE) {
      const timer = setTimeout(() => triggerSync(), 1500);
      return () => clearTimeout(timer);
    }
  }, [network, vault.records, isSyncing, userRole]);

  // Recording Logic
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          setIsTranscribing(true);
          try {
            const transcribed = await processingService.speechToText(base64);
            if (userRole === "PATIENT")
              setNewSymptom((prev) =>
                prev ? `${prev} ${transcribed}` : transcribed
              );
            if (userRole === "DOCTOR")
              setDoctorNoteInput((prev) =>
                prev ? `${prev} ${transcribed}` : transcribed
              );
          } finally {
            setIsTranscribing(false);
            setIsVoiceCapturing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsVoiceCapturing(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required for voice recording.");
      setIsVoiceCapturing(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isVoiceCapturing) {
      mediaRecorderRef.current.stop();
    }
  };

  // Actions
  const handleRecordSymptom = () => {
    if (!newSymptom.trim()) return;
    const record: MedicalRecord = {
      id: `SYM-${Date.now()}`,
      type: "SYMPTOM",
      content: newSymptom,
      timestamp: Date.now(),
      status: "PENDING",
      severity: "MEDIUM",
    };
    setVault((prev) => ({ ...prev, records: [...prev.records, record] }));
    setNewSymptom("");
    setIsRecordingUI(false);
    // 🚀 FORCE SYNC IMMEDIATELY
    console.log("🔥 calling triggerSync after symptom");
    triggerSync();
  };

  const handleMediaUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const record: MedicalRecord = {
        id: `VIS-${Date.now()}`,
        type: "VISUAL_TRIAGE",
        content: `Visual Attachment: ${file.name}`,
        timestamp: Date.now(),
        status: "PENDING",
        media: {
          type: file.type.startsWith("video") ? "VIDEO_FRAMES" : "IMAGE",
          lowResData: base64,
          analysis: "Queued for Specialist Routing",
        },
      };
      setVault((prev) => ({ ...prev, records: [...prev.records, record] }));
      setWhatsappNotify(`Visual record saved to vault. Syncing to specialist.`);
      // 🚀 FORCE SYNC IMMEDIATELY
      console.log("🔥 calling triggerSync after media");
      triggerSync();
      setTimeout(() => setWhatsappNotify(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  // Calculate unread message count from local records and backend messages
  useEffect(() => {
    if (userRole === "PATIENT" && patientProfile) {
      const doctorRecords = vault.records.filter(
        (record) =>
          record.type === "PRESCRIPTION" || record.type === "DOCTOR_NOTE"
      );

      // Count unread backend messages
      const unreadBackendMessages = backendMessages.filter(
        (msg) => !msg.read
      ).length;

      // Total unread count
      setUnreadMessageCount(doctorRecords.length + unreadBackendMessages);
    }
  }, [userRole, patientProfile, vault.records, backendMessages]);

  const handleDoctorSubmit = async () => {
    if (!activeCase || (!doctorMedInput.trim() && !doctorNoteInput.trim()))
      return;
    setIsSyncing(true);
    try {
      const clinicalContext = doctorNoteInput || "Standard clinical advice.";
      const medication = doctorMedInput || "General health consultation.";

      const type = doctorMedInput ? "PRESCRIPTION" : "DOCTOR_NOTE";
      const messagePayload = doctorMedInput
        ? `RX: ${medication}`
        : `Advice: ${doctorNoteInput}`;

      // First generate translated content/icons for patient delivery
      const translationResponse = await fetch(
        "http://localhost:4000/api/patient-response",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            note: doctorNoteInput,
            medication: doctorMedInput,
            language: patientProfile?.language || "English",
          }),
        }
      );

      const translation =
        translationResponse.ok ? await translationResponse.json() : null;

      // Persist the doctor message so patients can fetch it later
      const response = await fetch(
        "http://localhost:4000/api/send-doctor-message",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: activeCase.patientId,
            doctorId: doctorProfile?.id || "DOCTOR",
            doctorName: doctorProfile?.name || "Unknown Doctor",
            doctorSpecialization:
              doctorProfile?.specialization || "General Medicine",
            type,
            message: messagePayload,
            timestamp: Date.now(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const response_data = await response.json();

      // Generate thread ID for conversation
      const threadId = `THREAD-${activeCase.patientId}-${Date.now()}`;

      // Create doctor message with proper information
      const doctorMessage: MedicalRecord = {
        id: `DOC-${Date.now()}`,
        type: type as any,
        content: messagePayload,
        translatedContent:
          translation?.text || doctorMedInput || doctorNoteInput,
        timestamp: Date.now(),
        status: "SYNCED",
        icons: translation?.icons as any,
        doctorInfo: {
          name: doctorProfile?.name || "Unknown Doctor",
          specialization: doctorProfile?.specialization || "General Medicine",
          clinicId: doctorProfile?.clinicId || "UNKNOWN_CLINIC",
        },
        threadId: threadId,
        // Link to the original symptom if we can find it
        parentRecordId: activeCase.patientId,
      };

      // Store doctor message in the patient's vault
      setVault((prev) => ({
        ...prev,
        records: [...prev.records, doctorMessage],
      }));

      if (doctorMedInput) {
        const newOrder: PharmacyOrder = {
          id: `ORD-${Math.floor(Math.random() * 1000)}`,
          patientName: activeCase.patientName,
          medication: medication,
          instruction: response_data.text || doctorMedInput,
          timestamp: Date.now(),
          status: "RECEIVED",
          prescribedBy: doctorProfile?.name,
        };
        setOrders((prev) => [newOrder, ...prev]);
        setWhatsappNotify(
          `WhatsApp: RX for ${activeCase.patientName} sent to Hub.`
        );
      } else {
        setWhatsappNotify(`WhatsApp: Note sent to ${activeCase.patientName}.`);
      }

      // Mark packet as processed on backend
      await processingService.markPacketProcessed(
        activeCase.packetId,
        doctorProfile?.name
      );

      setSyncPool((prev) =>
        prev.filter((p) => p.packetId !== activeCase.packetId)
      );
      setActiveCase(null);
      setDoctorMedInput("");
      setDoctorNoteInput("");
      setTimeout(() => setWhatsappNotify(null), 5000);
    } catch (error) {
      console.error("❌ Error in handleDoctorSubmit:", error);
      setWhatsappNotify("Error: Failed to send message. Please try again.");
      setTimeout(() => setWhatsappNotify(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const playVoiceBack = async (recordId: string, text: string) => {
    if (isPlaying) return;
    setIsPlaying(recordId);
    try {
      const base64Audio = await processingService.textToSpeech(text);
      if (base64Audio) {
        const audioCtx = new (window.AudioContext ||
          (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++)
          bytes[i] = binaryString.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++)
          channelData[i] = dataInt16[i] / 32768.0;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsPlaying(null);
        source.start();
      } else {
        setIsPlaying(null);
      }
    } catch (e) {
      console.error(e);
      setIsPlaying(null);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    const updatedLang = newLang as SupportedLanguage;
    if (patientProfile) {
      const updatedProfile = { ...patientProfile, language: updatedLang };
      setPatientProfile(updatedProfile);
      setVault((v) => ({ ...v, ...updatedProfile }));
    }
  };

  const DoctorOnboarding = () => {
    const [form, setForm] = useState<DoctorProfile>({
      name: "",
      specialization: "General Medicine",
      clinicId: "",
    });
    const handleSave = () => {
      if (!form.name || !form.clinicId) return;
      setDoctorProfile(form);
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-600 p-6">
        <div className="text-center mb-10 text-white animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            Arogya Sarathi Terminal
          </h1>
          <p className="text-emerald-100 font-medium opacity-90">
            Medical Diagnostic Hub & Delta Sync
          </p>
        </div>
        <div className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl space-y-8 animate-in zoom-in duration-500">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Doctor Name
              </label>
              <div className="relative">
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Enter Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Stethoscope
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={24}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Specialization
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
                value={form.specialization}
                onChange={(e) =>
                  setForm({ ...form, specialization: e.target.value })
                }
              >
                <option>General Medicine</option>
                <option>Cardiology</option>
                <option>Dermatology</option>
                <option>Orthopedics</option>
                <option>Pediatrics</option>
                <option>Gynaecology</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                MCI / Clinic ID
              </label>
              <div className="relative">
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="MCI-404-XYZ"
                  value={form.clinicId}
                  onChange={(e) =>
                    setForm({ ...form, clinicId: e.target.value })
                  }
                />
                <Building2
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={24}
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <ArrowRight size={20} /> Access Clinical Terminal
          </button>
        </div>
      </div>
    );
  };

  const PharmacyOnboarding = () => {
    const [form, setForm] = useState<PharmacyProfile>({
      name: "",
      license: "",
      district: "",
    });
    const handleSave = () => {
      if (!form.name || !form.license) return;
      setPharmacyProfile(form);
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-amber-600 p-6">
        <div className="text-center mb-10 text-white animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            Pharmacy Hub
          </h1>
          <p className="text-amber-100 font-medium opacity-90">
            Rural Medical Fulfillment Loop
          </p>
        </div>
        <div className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl space-y-8 animate-in zoom-in duration-500">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Pharmacy Name
              </label>
              <div className="relative">
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="Enter Shop Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <ShoppingBag
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={24}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Drug License Number
              </label>
              <input
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="DL-XXXXX-2024"
                value={form.license}
                onChange={(e) => setForm({ ...form, license: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Operating District
              </label>
              <div className="relative">
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="District Name"
                  value={form.district}
                  onChange={(e) =>
                    setForm({ ...form, district: e.target.value })
                  }
                />
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={24}
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-amber-600 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-100 flex items-center justify-center gap-3 hover:bg-amber-700 active:scale-95 transition-all"
          >
            <ArrowRight size={20} /> Initialize Fulfillment Hub
          </button>
        </div>
      </div>
    );
  };

  const PatientOnboarding = () => {
    const [form, setForm] = useState<PatientProfile>({
      patientId: "",
      name: "",
      age: 0,
      location: "",
      state: "",
      language: "English",
      phoneNumber: "",
      houseNumber: "",
      streetVillage: "",
      district: "",
    });
    const handleSave = () => {
      if (!form.name || !form.age || !form.state || !form.district) return;

      // Generate patient ID if not present
      const patientId =
        form.patientId || generatePatientId(form.name, form.age, form.location);

      const newPatient: PatientProfile = {
        ...form,
        patientId,
      };

      // Add to available patients if not already present
      setAvailablePatients((prev) => {
        const exists = prev.find((p) => p.patientId === patientId);
        const updated = exists ? prev : [...prev, newPatient];
        savePatientsToStorage(updated);
        return updated;
      });

      // Set as current patient
      saveActivePatientToStorage(newPatient);
      setPatientProfile(newPatient);
      setIsAddingNewPatient(false);
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-600 p-6">
        <div className="text-center mb-10 text-white animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-black tracking-tight mb-2">
            Arogya Sarathi Patient
          </h1>
          <p className="text-indigo-100 font-medium opacity-90">
            Secure Medical Vault Setup
          </p>
        </div>
        <div className="bg-white rounded-[40px] p-8 w-full max-w-lg shadow-2xl space-y-8 animate-in zoom-in duration-500">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Full Name
              </label>
              <div className="relative">
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter Your Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={24}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                  Age
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Age"
                  value={form.age || ""}
                  onChange={(e) =>
                    setForm({ ...form, age: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                  Phone Number
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm({ ...form, phoneNumber: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                House Number
              </label>
              <input
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="House/Flat Number"
                value={form.houseNumber}
                onChange={(e) =>
                  setForm({ ...form, houseNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Street/Village
              </label>
              <input
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Street Name or Village"
                value={form.streetVillage}
                onChange={(e) =>
                  setForm({ ...form, streetVillage: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                  District
                </label>
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="District Name"
                  value={form.district}
                  onChange={(e) =>
                    setForm({ ...form, district: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                  State
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  value={form.state}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setForm({
                      ...form,
                      state: newState,
                      language: STATE_LANGUAGE_MAP[newState] || "English",
                    });
                  }}
                >
                  <option value="">Select State</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Kerala">Kerala</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">
                Preferred Language
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                value={form.language}
                onChange={(e) =>
                  setForm({
                    ...form,
                    language: e.target.value as SupportedLanguage,
                  })
                }
              >
                {Object.values(STATE_LANGUAGE_MAP)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                <option value="English">English</option>
                <option value="Swahili">Swahili</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <ArrowRight size={20} /> Initialize Patient Vault
          </button>
        </div>
      </div>
    );
  };

  // --- Main Render Logic ---

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3 text-center mb-8">
            <div className="inline-flex bg-indigo-600 p-4 rounded-3xl text-white mb-4 shadow-2xl shadow-indigo-500/20">
              <Database size={40} />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Arogya Sarathi
            </h1>
            <p className="text-slate-400 mt-2 font-medium">
              Rural Medical Sync Network
            </p>
          </div>
          {[
            {
              role: "PATIENT",
              icon: UserCircle,
              title: "Patient",
              desc: "Secure local vault",
              color: "bg-indigo-600",
            },
            {
              role: "DOCTOR",
              icon: Stethoscope,
              title: "Doctor",
              desc: "Sync & clinical desk",
              color: "bg-emerald-600",
            },
            {
              role: "PHARMACY",
              icon: ShoppingBag,
              title: "Pharmacy",
              desc: "Order fulfillment hub",
              color: "bg-amber-600",
            },
          ].map((btn) => (
            <button
              key={btn.role}
              onClick={() => setUserRole(btn.role as UserRole)}
              className="group bg-slate-800 hover:bg-slate-700 p-8 rounded-[48px] text-left transition-all hover:-translate-y-2 border border-slate-700 hover:border-indigo-500/50 shadow-2xl"
            >
              <div
                className={`${btn.color} w-16 h-16 rounded-3xl flex items-center justify-center text-white mb-6 group-hover:rotate-6 transition-transform`}
              >
                <btn.icon size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {btn.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {btn.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Patient Selector Component (modern modal)
  const SelectPatientModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
      onClick={() => setShowPatientSelector(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.25em]">
              Patient Portal
            </p>
            <h3 className="text-xl font-black text-slate-900">Select Patient</h3>
          </div>
          <button
            onClick={() => setShowPatientSelector(false)}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3">
          {availablePatients.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-sm font-bold text-slate-500">
                No patients yet. Add a new patient to get started.
              </p>
            </div>
          )}

          {availablePatients.map((patient) => {
            const isActive = patientProfile?.patientId === patient.patientId;
            return (
              <button
                key={patient.patientId}
                onClick={() => handlePatientSwitch(patient)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 hover:shadow-md ${
                  isActive
                    ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                    : "border-slate-100 bg-white hover:border-indigo-100"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-indigo-600"
                  }`}
                >
                  <User size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-black text-slate-900">
                    {patient.name}
                  </p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {patient.age}y • {patient.state || patient.location}
                  </p>
                </div>
                {isActive && (
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 space-y-3">
          <button
            onClick={() => {
              handlePatientSwitch(null);
            }}
            className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
          >
            + Add New Patient
          </button>
          <button
            onClick={clearDemoData}
            className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-700 underline underline-offset-4 transition-colors"
          >
            Clear demo data
          </button>
        </div>
      </div>
    </div>
  );

  // Handle Role-based Onboarding
  if (userRole === "PATIENT" && !patientProfile) return <PatientOnboarding />;
  if (userRole === "DOCTOR" && !doctorProfile) return <DoctorOnboarding />;
  if (userRole === "PHARMACY" && !pharmacyProfile)
    return <PharmacyOnboarding />;

  // Show Emergency Hospital Finder if requested
  if (showEmergencyHospitalFinder && userRole === "PATIENT" && patientProfile) {
    return (
      <EmergencyHospitalFinder
        onBack={() => setShowEmergencyHospitalFinder(false)}
        patientProfile={{
          name: patientProfile.name,
          location: patientProfile.location,
          state: patientProfile.state,
          coordinates: patientProfile.coordinates,
        }}
      />
    );
  }

  // Show Medicine Reminder if requested
  if (showMedicineReminder && userRole === "PATIENT" && patientProfile) {
    return (
      <MedicineReminder
        patientId={patientProfile.patientId}
        onBack={() => setShowMedicineReminder(false)}
      />
    );
  }

  // Show Medicine Ordering if requested
  if (showMedicineOrdering && userRole === "PATIENT" && patientProfile) {
    return (
      <MedicineOrdering
        patientProfile={patientProfile}
        onBack={() => setShowMedicineOrdering(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-inter">
      {/* Network Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 text-white text-[10px] py-1.5 px-6 flex justify-between items-center transition-all duration-500 shadow-sm ${
          network === ConnectivityState.OFFLINE
            ? "bg-red-600"
            : network === ConnectivityState.LOW_SIGNAL
            ? "bg-amber-600"
            : "bg-emerald-600"
        }`}
      >
        <div className="flex items-center space-x-2 font-bold uppercase tracking-widest">
          {network === ConnectivityState.OFFLINE ? (
            <CloudOff size={12} />
          ) : (
            <Activity size={12} />
          )}
          <span>
            {network === ConnectivityState.OFFLINE
              ? "Local Vault Mode"
              : "Cloud Sync Active"}
          </span>
        </div>
        <div className="flex items-center space-x-4 font-bold">
          <div className="flex items-center space-x-1">
            <Clock size={10} />
            <span>{isSyncing ? "Processing..." : "Secure"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 px-2 py-0.5 rounded hover:bg-white/40 transition-colors flex items-center gap-1"
          >
            <LogOut size={10} /> Logout
          </button>
        </div>
      </div>

      {whatsappNotify && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-[#25D366] text-white p-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/20 animate-in slide-in-from-top">
            <div className="bg-white/20 p-2 rounded-full">
              <MessageCircle size={18} />
            </div>
            <div className="text-xs">
              <p className="font-bold">Medical Relay</p>
              <p className="opacity-90">{whatsappNotify}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-8 z-40 mx-4 mt-12 rounded-3xl shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl text-white ${
                userRole === "PATIENT"
                  ? "bg-indigo-600"
                  : userRole === "DOCTOR"
                  ? "bg-emerald-600"
                  : "bg-amber-600"
              }`}
            >
              <Database size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Arogya Sarathi
              </p>
              <h2 className="font-extrabold text-slate-900 text-sm">
                {userRole} TERMINAL
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {userRole === "PATIENT" && (
              <button
                onClick={openPatientPortal}
                className="flex items-center space-x-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all"
              >
                <User size={14} />
                <span>
                  Patient Portal{" "}
                  {availablePatients.length > 0
                    ? `(${availablePatients.length})`
                    : ""}
                </span>
              </button>
            )}
            <div className="hidden sm:flex items-center space-x-2 text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <BadgeCheck size={14} className="text-emerald-500" />
              <span>
                SESSION:{" "}
                {doctorProfile?.clinicId ||
                  patientProfile?.name ||
                  pharmacyProfile?.license}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4 pt-10">
        {/* PATIENT VIEW */}
        {userRole === "PATIENT" && (
          <div className="space-y-6">
            {/* Patient Profile Header */}
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex items-center justify-between group">
              <div className="flex items-center space-x-5">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-400 border border-indigo-100 group-hover:scale-105 transition-transform">
                  <User size={40} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    {patientProfile?.name}
                  </h1>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {patientProfile?.age}y • {patientProfile?.streetVillage},{" "}
                    {patientProfile?.district}, {patientProfile?.state}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Preferred Language
                </label>
                <div className="relative inline-block">
                  <select
                    value={patientProfile?.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="appearance-none bg-indigo-600 text-white px-4 py-2 pr-8 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  >
                    {Object.values(STATE_LANGUAGE_MAP)
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    <option value="English">English</option>
                    <option value="Swahili">Swahili</option>
                  </select>
                  <Languages
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none opacity-80"
                  />
                </div>
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="bg-white rounded-[40px] p-2 shadow-sm border border-slate-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActivePatientTab("symptoms")}
                  className={`flex-1 py-4 px-6 rounded-3xl font-bold text-sm uppercase tracking-widest transition-all ${
                    activePatientTab === "symptoms"
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Activity size={18} className="inline mr-2" />
                  My Symptoms
                </button>
                <button
                  onClick={() => setActivePatientTab("responses")}
                  className={`flex-1 py-4 px-6 rounded-3xl font-bold text-sm uppercase tracking-widest transition-all relative ${
                    activePatientTab === "responses"
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <MessageCircle size={18} className="inline mr-2" />
                  Doctor Responses
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {unreadMessageCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActivePatientTab("emergency")}
                  className={`flex-1 py-4 px-6 rounded-3xl font-bold text-sm uppercase tracking-widest transition-all ${
                    activePatientTab === "emergency"
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <AlertTriangle size={18} className="inline mr-2" />
                  Emergency
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowMedicineReminder(true)}
                className="bg-indigo-600 rounded-[40px] p-6 text-white flex items-center justify-between hover:bg-indigo-700 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-bold text-sm uppercase tracking-widest">
                    Medicine Reminders
                  </h3>
                  <p className="text-xs opacity-80 mt-1">Never miss a dose</p>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl">
                  <Pill size={24} />
                </div>
              </button>
              <button
                onClick={() => setShowMedicineOrdering(true)}
                className="bg-green-600 rounded-[40px] p-6 text-white flex items-center justify-between hover:bg-green-700 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-bold text-sm uppercase tracking-widest">
                    Order Medicines
                  </h3>
                  <p className="text-xs opacity-80 mt-1">Quick delivery</p>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl">
                  <ShoppingCart size={24} />
                </div>
              </button>
            </div>

            {/* TAB CONTENT BASED ON ACTIVE TAB */}
            {activePatientTab === "symptoms" && (
              <div className="space-y-6">
                {/* SYMPTOM INGESTION CARD */}
                <div className="bg-[#6366F1] rounded-[48px] p-10 shadow-2xl text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform group-hover:rotate-0">
                    <CloudLightning size={120} />
                  </div>
                  <div className="relative z-10 space-y-8 text-center">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-2 opacity-80">
                        Symptom Ingestion
                      </h3>
                      <p className="text-sm font-medium opacity-90">
                        System will auto-route your entry to a specialist.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-[40px] p-8 border border-white/20 border-dashed min-h-[220px] flex flex-col items-center justify-center space-y-6">
                      {isTranscribing || isVoiceCapturing ? (
                        <>
                          <div className="flex items-center gap-1.5 h-16">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div
                                key={i}
                                className={`w-2.5 bg-white/40 rounded-full animate-bounce`}
                                style={{
                                  height: `${20 + Math.random() * 80}%`,
                                  animationDelay: `${i * 0.1}s`,
                                }}
                              ></div>
                            ))}
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest animate-pulse">
                            {isTranscribing
                              ? `Processing ${patientProfile?.language} Audio...`
                              : "Listening..."}
                          </p>
                        </>
                      ) : isRecordingUI ? (
                        <div className="w-full space-y-4">
                          <textarea
                            value={newSymptom}
                            onChange={(e) => setNewSymptom(e.target.value)}
                            placeholder={`Describe your problem in ${patientProfile?.language}...`}
                            className="w-full bg-white/20 border border-white/10 rounded-3xl p-6 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white outline-none h-32 text-sm"
                          />
                          <button
                            onClick={() => setIsRecordingUI(false)}
                            className="text-[10px] font-black uppercase opacity-60 hover:opacity-100"
                          >
                            Cancel Text Entry
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-center">
                          {newSymptom ? (
                            <div className="space-y-4">
                              <p className="text-lg font-bold">
                                "{newSymptom}"
                              </p>
                              <button
                                onClick={() => setNewSymptom("")}
                                className="text-[10px] font-black uppercase tracking-widest opacity-60"
                              >
                                Clear Entry
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-4">
                                <button
                                  onClick={startVoiceRecording}
                                  className="w-20 h-20 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border border-white/20 shadow-xl group"
                                >
                                  <Mic
                                    size={32}
                                    className="group-hover:scale-110 transition-transform"
                                  />
                                </button>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-20 h-20 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border border-white/20 shadow-xl group"
                                >
                                  <Camera
                                    size={32}
                                    className="group-hover:scale-110 transition-transform"
                                  />
                                </button>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-20 h-20 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border border-white/20 shadow-xl group"
                                >
                                  <Video
                                    size={32}
                                    className="group-hover:scale-110 transition-transform"
                                  />
                                </button>
                                <button
                                  onClick={() => setIsRecordingUI(true)}
                                  className="w-20 h-20 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border border-white/20 shadow-xl group"
                                >
                                  <TypeIcon
                                    size={32}
                                    className="group-hover:scale-110 transition-transform"
                                  />
                                </button>
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                                Voice • Photo • Video • Text
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      {isVoiceCapturing ? (
                        <button
                          onClick={stopVoiceRecording}
                          className="w-full bg-red-500 text-white font-black py-5 rounded-[32px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all animate-pulse shadow-xl"
                        >
                          <Square size={20} className="fill-current" /> Stop and
                          Process
                        </button>
                      ) : (
                        <button
                          onClick={
                            newSymptom
                              ? handleRecordSymptom
                              : startVoiceRecording
                          }
                          disabled={isTranscribing}
                          className="w-full bg-white text-indigo-600 font-black py-5 rounded-[32px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-slate-50 active:scale-95 shadow-xl disabled:opacity-50"
                        >
                          {isTranscribing ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <ArrowUpCircle size={20} />
                          )}
                          {isTranscribing
                            ? "Analyzing..."
                            : newSymptom
                            ? "Submit to Medical Loop"
                            : "Start Medical Triage Loop"}
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleMediaUpload}
                      accept="image/*,video/*"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Patient Symptoms Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <User size={14} /> <span>My Symptoms & Records</span>
                  </div>
                  {(() => {
                    const patientRecords = vault.records.filter(
                      (record) =>
                        record.type === "SYMPTOM" ||
                        record.type === "VISUAL_TRIAGE" ||
                        record.type === "HISTORY"
                    );

                    if (patientRecords.length === 0) {
                      return (
                        <div className="text-center py-16 bg-white rounded-[40px] border border-slate-100 shadow-sm">
                          <User
                            className="mx-auto mb-4 text-slate-200"
                            size={48}
                          />
                          <p className="text-slate-400 text-xs font-bold">
                            No symptoms recorded yet.
                          </p>
                        </div>
                      );
                    }

                    return patientRecords
                      .slice()
                      .reverse()
                      .map((record) => (
                        <div
                          key={record.id}
                          className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group"
                        >
                          <div className="flex items-start gap-6">
                            <div className="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white p-4 rounded-3xl transition-colors">
                              {record.type === "VISUAL_TRIAGE" ? (
                                <Camera size={28} />
                              ) : (
                                <Activity size={28} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {new Date(
                                    record.timestamp
                                  ).toLocaleDateString()}{" "}
                                  •{" "}
                                  {new Date(
                                    record.timestamp
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {record.status === "PENDING" && (
                                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">
                                    <Wifi size={10} /> Local Storage
                                  </div>
                                )}
                              </div>
                              {(() => {
                                const display = getDisplayText(
                                  `local-${record.id}`,
                                  record.content
                                );
                                return (
                                  <>
                                    <p className="text-slate-900 font-bold text-lg mb-1 leading-snug">
                                      {display.primary}
                                    </p>
                                    {display.secondary && (
                                      <p className="text-[11px] text-slate-500 font-semibold">
                                        {display.secondary}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                              {record.media?.analysis && (
                                <p className="text-[10px] font-bold text-indigo-500 mb-3 uppercase tracking-wider">
                                  Status: {record.media.analysis}
                                </p>
                              )}
                              <button
                                onClick={() =>
                                  playVoiceBack(
                                    record.id,
                                    record.translatedContent || record.content!
                                  )
                                }
                                className="flex items-center gap-3 text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-6 py-3 rounded-2xl transition-all hover:bg-indigo-100 active:scale-95"
                              >
                                {isPlaying === record.id ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Volume2 size={16} />
                                )}
                                Play Instruction
                              </button>
                            </div>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}

            {activePatientTab === "responses" && (
              <div className="space-y-4">
                {/* Doctor Messages Section */}
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Stethoscope size={14} /> <span>Doctor Responses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-2 uppercase tracking-wider hover:border-indigo-200 transition-colors"
                    >
                      {["English", "Telugu", "Hindi", "Tamil", "Kannada"].map(
                        (lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      onClick={fetchPatientMessages}
                      className="text-[9px] font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-full uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      Refresh
                    </button>
                    <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full uppercase tracking-wider border border-emerald-100">
                      {backendMessages.length > 0
                        ? `${backendMessages.length} Backend`
                        : "Local Records"}
                    </div>
                  </div>
                </div>

                {/* Doctor Messages from Backend */}
                {backendMessages.length > 0 && (
                  <div className="space-y-4">
                    {backendMessages
                      .slice()
                      .reverse()
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className="bg-white rounded-[40px] p-8 border border-emerald-100 shadow-sm transition-all hover:shadow-md hover:border-emerald-200 group"
                        >
                          <div className="flex items-start gap-6">
                            <div className="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white p-4 rounded-3xl transition-colors">
                              {msg.type === "PRESCRIPTION" ? (
                                <ShieldCheck size={28} />
                              ) : (
                                <MessageCircle size={28} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {msg.timestamp
                                    ? new Date(msg.timestamp).toLocaleString()
                                    : "From Doctor"}
                                </span>
                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">
                                  <CheckCircle2 size={10} /> Backend Message
                                </div>
                              </div>

                              <div className="bg-emerald-50 p-4 rounded-2xl mb-4 border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Stethoscope
                                    size={14}
                                    className="text-emerald-600"
                                  />
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                    Doctor Details
                                  </span>
                                </div>
                                <div className="text-sm">
                                  <p className="font-bold text-emerald-800">
                                    {msg.doctorName || "Doctor"}
                                  </p>
                                  <p className="text-[10px] text-emerald-600 uppercase tracking-wider">
                                    {msg.specialization || "General Medicine"}
                                  </p>
                                </div>
                              </div>

                              {(() => {
                                const display = getDisplayText(
                                  `backend-${msg.id}`,
                                  msg.content
                                );
                                return (
                                  <>
                                    <p className="text-slate-900 font-bold text-lg mb-1 leading-snug">
                                      {display.primary}
                                    </p>
                                    {display.secondary && (
                                      <p className="text-[11px] text-slate-500 font-semibold">
                                        {display.secondary}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Doctor Messages from Local Vault */}
                {(() => {
                  const doctorRecords = vault.records.filter(
                    (record) =>
                      record.type === "PRESCRIPTION" ||
                      record.type === "DOCTOR_NOTE"
                  );

                  if (doctorRecords.length === 0) {
                    return (
                      <div className="text-center py-16 bg-white rounded-[40px] border border-slate-100 shadow-sm">
                        <MessageCircle
                          className="mx-auto mb-4 text-slate-200"
                          size={48}
                        />
                        <p className="text-slate-400 text-xs font-bold">
                          No doctor responses yet.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {doctorRecords
                        .slice()
                        .reverse()
                        .map((record) => (
                          <div
                            key={record.id}
                            className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-emerald-100 group"
                          >
                            <div className="flex items-start gap-6">
                              <div className="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white p-4 rounded-3xl transition-colors">
                                {record.type === "PRESCRIPTION" ? (
                                  <ShieldCheck size={28} />
                                ) : (
                                  <MessageCircle size={28} />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {new Date(
                                      record.timestamp
                                    ).toLocaleDateString()}{" "}
                                    •{" "}
                                    {new Date(
                                      record.timestamp
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">
                                    <CheckCircle2 size={10} /> From Doctor
                                  </div>
                                </div>

                                {/* Doctor Information */}
                                {record.doctorInfo && (
                                  <div className="bg-emerald-50 p-4 rounded-2xl mb-4 border border-emerald-100">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Stethoscope
                                        size={14}
                                        className="text-emerald-600"
                                      />
                                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                        Doctor Details
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <p className="font-bold text-emerald-800">
                                        {record.doctorInfo.name}
                                      </p>
                                      <p className="text-[10px] text-emerald-600 uppercase tracking-wider">
                                        {record.doctorInfo.specialization} •{" "}
                                        {record.doctorInfo.clinicId}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {(() => {
                                  const display = getDisplayText(
                                    `local-${record.id}`,
                                    record.content
                                  );
                                  return (
                                    <>
                                      <p className="text-slate-900 font-bold text-lg mb-1 leading-snug">
                                        {display.primary}
                                      </p>
                                      {display.secondary && (
                                        <p className="text-[11px] text-slate-500 font-semibold">
                                          {display.secondary}
                                        </p>
                                      )}
                                    </>
                                  );
                                })()}
                                <div className="flex gap-2 mb-4">
                                  {record.icons?.map((icon, idx) => (
                                    <IconDisplay key={idx} type={icon} />
                                  ))}
                                </div>
                                <button
                                  onClick={() =>
                                    playVoiceBack(
                                      record.id,
                                      record.translatedContent ||
                                        record.content!
                                    )
                                  }
                                  className="flex items-center gap-3 text-xs font-black uppercase text-emerald-600 bg-emerald-50 px-6 py-3 rounded-2xl transition-all hover:bg-emerald-100 active:scale-95"
                                >
                                  {isPlaying === record.id ? (
                                    <Loader2
                                      className="animate-spin"
                                      size={16}
                                    />
                                  ) : (
                                    <Volume2 size={16} />
                                  )}
                                  Play Doctor's Instructions
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {activePatientTab === "emergency" && (
              <div className="space-y-6">
                {/* EMERGENCY HOSPITAL FINDER BUTTON */}
                <div className="bg-red-600 rounded-[48px] p-8 shadow-2xl text-white relative overflow-hidden group hover:bg-red-700 transition-colors">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform group-hover:rotate-0">
                    <AlertTriangle size={120} />
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-[0.3em] mb-2">
                          Emergency
                        </h3>
                        <p className="text-sm font-medium opacity-90">
                          Find the nearest hospitals and get directions
                          immediately
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEmergencyHospitalFinder(true)}
                      className="bg-white text-red-600 font-black py-4 px-8 rounded-[32px] uppercase tracking-widest flex items-center gap-3 transition-all hover:bg-slate-50 active:scale-95 shadow-xl"
                    >
                      <AlertTriangle size={20} />
                      Find Hospital
                    </button>
                  </div>
                </div>

                {/* EMERGENCY HOSPITAL FINDER */}
                {patientProfile && (
                  <div className="mt-6">
                    <EmergencyHospitalFinder
                      patientProfile={patientProfile}
                      onHospitalSelect={(hospital) => {
                        console.log("Selected hospital:", hospital.name);
                        // You can add navigation or contact functionality here
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DOCTOR VIEW - SPECIALTY ROUTING */}
        {userRole === "DOCTOR" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  Clinical Desk
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Specialty: {doctorProfile?.specialization}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                <Users size={14} />{" "}
                <span>
                  {
                    syncPool.filter(
                      (p) =>
                        p.suggestedSpecialty === doctorProfile?.specialization
                    ).length
                  }{" "}
                  Targeted Cases
                </span>
              </div>
            </div>

            {activeCase ? (
              <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <button
                  onClick={() => setActiveCase(null)}
                  className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Triage Queue
                </button>

                <div className="bg-white rounded-[48px] border border-slate-200 shadow-2xl overflow-hidden">
                  <div
                    className={`px-10 py-5 text-white flex justify-between items-center font-black uppercase tracking-widest text-[10px] ${
                      activeCase.suggestedSpecialty ===
                      doctorProfile?.specialization
                        ? "bg-emerald-600"
                        : "bg-slate-900"
                    }`}
                  >
                    <span>Case Review: {activeCase.packetId}</span>
                    <span>Medical Route: {activeCase.suggestedSpecialty}</span>
                  </div>
                  <div className="p-10 space-y-10">
                    {/* Enhanced Patient Profile Display */}
                    <div className="space-y-8">
                      {/* Basic Patient Info */}
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 border border-slate-100">
                          <User size={40} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-slate-900 leading-none mb-2">
                            {activeCase.patientName}
                          </h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {activeCase.historyContext}
                          </p>
                        </div>
                      </div>

                      {/* Comprehensive Patient Context */}
                      {activeCase.patientContext ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Patient Demographics */}
                          <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                            <div className="flex items-center gap-2 mb-4">
                              <UserCircle size={16} className="text-blue-600" />
                              <h4 className="text-sm font-black text-blue-700 uppercase tracking-wider">
                                Patient Profile
                              </h4>
                            </div>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium text-blue-600">
                                  Age:
                                </span>
                                <span className="font-bold text-blue-800">
                                  {activeCase.patientContext.age} years
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-blue-600">
                                  Phone:
                                </span>
                                <span className="font-bold text-blue-800">
                                  {activeCase.patientContext.phoneNumber}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-blue-600">
                                  Language:
                                </span>
                                <span className="font-bold text-blue-800">
                                  {activeCase.patientContext.language}
                                </span>
                              </div>
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                  Address:
                                </span>
                                <p className="text-sm font-bold text-blue-800 mt-1">
                                  {activeCase.patientContext.houseNumber},{" "}
                                  {activeCase.patientContext.streetVillage},{" "}
                                  {activeCase.patientContext.district},{" "}
                                  {activeCase.patientContext.state}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Medical History & Current Status */}
                          <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
                            <div className="flex items-center gap-2 mb-4">
                              <History size={16} className="text-emerald-600" />
                              <h4 className="text-sm font-black text-emerald-700 uppercase tracking-wider">
                                Medical Status
                              </h4>
                            </div>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium text-emerald-600">
                                  Previous Visits:
                                </span>
                                <span className="font-bold text-emerald-800">
                                  {
                                    activeCase.patientContext
                                      .previousInteractions
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-emerald-600">
                                  Active Reminders:
                                </span>
                                <span className="font-bold text-emerald-800">
                                  {activeCase.patientContext.activeReminders}
                                </span>
                              </div>
                              {activeCase.patientContext.riskFactors?.length >
                                0 && (
                                <div className="mt-3 pt-3 border-t border-emerald-200">
                                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                    Risk Factors:
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {activeCase.patientContext.riskFactors.map(
                                      (factor: string, idx: number) => (
                                        <span
                                          key={idx}
                                          className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full"
                                        >
                                          {factor}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-6 rounded-[32px] border border-yellow-100 text-center">
                          <Info
                            size={24}
                            className="mx-auto text-yellow-500 mb-2"
                          />
                          <p className="text-sm font-bold text-yellow-700">
                            Patient context is not available for this case.
                          </p>
                        </div>
                      )}

                      {/* Current Medications */}
                      {activeCase.patientContext?.currentMedications?.length >
                        0 && (
                        <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100">
                          <div className="flex items-center gap-2 mb-4">
                            <Pill size={16} className="text-amber-600" />
                            <h4 className="text-sm font-black text-amber-700 uppercase tracking-wider">
                              Current Medications
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {activeCase.patientContext.currentMedications.map(
                              (med: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                                  <span className="text-sm font-bold text-amber-800">
                                    {med}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Medical History */}
                      {activeCase.patientContext?.medicalHistory?.length >
                        0 && (
                        <div className="bg-purple-50 p-6 rounded-[32px] border border-purple-100">
                          <div className="flex items-center gap-2 mb-4">
                            <FileWarning
                              size={16}
                              className="text-purple-600"
                            />
                            <h4 className="text-sm font-black text-purple-700 uppercase tracking-wider">
                              Recent Medical History
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {activeCase.patientContext.medicalHistory
                              .slice(0, 3)
                              .map((history: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-sm font-medium text-purple-800">
                                    {history}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Emergency Contact */}
                      {activeCase.patientContext?.emergencyContact && (
                        <div className="bg-red-50 p-6 rounded-[32px] border border-red-100">
                          <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={16} className="text-red-600" />
                            <h4 className="text-sm font-black text-red-700 uppercase tracking-wider">
                              Emergency Contact
                            </h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium text-red-600">
                                Contact:
                              </span>
                              <span className="font-bold text-red-800">
                                {
                                  activeCase.patientContext.emergencyContact
                                    .name
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-red-600">
                                Phone:
                              </span>
                              <span className="font-bold text-red-800">
                                {
                                  activeCase.patientContext.emergencyContact
                                    .phone
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-red-600">
                                Relationship:
                              </span>
                              <span className="font-bold text-red-800">
                                {
                                  activeCase.patientContext.emergencyContact
                                    .relationship
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Symptoms */}
                      {activeCase.currentSymptoms && (
                        <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
                          <div className="flex items-center gap-2 mb-4">
                            <Activity size={16} className="text-indigo-600" />
                            <h4 className="text-sm font-black text-indigo-700 uppercase tracking-wider">
                              Current Symptoms
                            </h4>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                Description:
                              </span>
                              <p className="text-sm font-medium text-indigo-800 mt-1">
                                {activeCase.currentSymptoms.description}
                              </p>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-indigo-600">
                                Severity:
                              </span>
                              <span
                                className={`font-bold px-2 py-1 rounded-full text-xs ${
                                  activeCase.currentSymptoms.severity === "HIGH"
                                    ? "bg-red-100 text-red-700"
                                    : activeCase.currentSymptoms.severity ===
                                      "MEDIUM"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {activeCase.currentSymptoms.severity}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-indigo-600">
                                Duration:
                              </span>
                              <span className="font-bold text-indigo-800">
                                {activeCase.currentSymptoms.duration}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-inner">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">
                          Medical Summary
                        </p>
                        <p className="text-base font-bold text-slate-800 leading-relaxed italic">
                          "{activeCase.summary}"
                        </p>
                      </div>
                      {activeCase.visualTriage && (
                        <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 shadow-inner">
                          <p className="text-[10px] font-black text-red-700 uppercase mb-4 tracking-widest flex items-center gap-2">
                            <Activity size={14} /> Visual Analysis
                          </p>
                          <p className="text-base font-bold text-red-900 leading-relaxed">
                            {activeCase.visualTriage}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-10 border-t border-slate-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
                          Patient Advice & Prescription
                        </h4>
                        <button
                          onClick={
                            isVoiceCapturing
                              ? stopVoiceRecording
                              : startVoiceRecording
                          }
                          className={`p-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase ${
                            isVoiceCapturing
                              ? "bg-red-500 animate-pulse text-white"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {isVoiceCapturing ? (
                            <Square size={16} />
                          ) : (
                            <Mic size={16} />
                          )}
                          {isVoiceCapturing ? "Recording..." : "Dictate Note"}
                        </button>
                      </div>
                      <input
                        value={doctorMedInput}
                        onChange={(e) => setDoctorMedInput(e.target.value)}
                        placeholder="Enter Medication (e.g. Paracetamol 500mg)"
                        className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                      />
                      <textarea
                        value={doctorNoteInput}
                        onChange={(e) => setDoctorNoteInput(e.target.value)}
                        placeholder="Type additional instructions here..."
                        className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 h-32 transition-all shadow-inner"
                      />

                      <button
                        onClick={handleDoctorSubmit}
                        disabled={isSyncing}
                        className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-emerald-200 flex items-center justify-center gap-3 hover:bg-emerald-700 disabled:bg-slate-200 transition-all uppercase tracking-[0.3em]"
                      >
                        {isSyncing ? (
                          <RefreshCw size={24} className="animate-spin" />
                        ) : (
                          <Send size={24} />
                        )}
                        Dispatch Treatment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {syncPool.length === 0 ? (
                  <div className="bg-white rounded-[48px] p-24 text-center border-2 border-dashed border-slate-200">
                    <RefreshCw
                      size={64}
                      className="mx-auto mb-8 text-slate-200 animate-spin-slow"
                    />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                      Waiting for rural sync packets...
                    </p>
                  </div>
                ) : (
                  syncPool.map((packet) => {
                    const isTargeted =
                      packet.suggestedSpecialty ===
                      doctorProfile?.specialization;
                    return (
                      <button
                        key={packet.packetId}
                        onClick={() => setActiveCase(packet)}
                        className={`bg-white p-8 rounded-[40px] border-2 shadow-sm flex items-center justify-between hover:scale-[1.02] transition-all text-left ${
                          isTargeted
                            ? "border-emerald-400 shadow-emerald-100"
                            : "border-slate-100 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-6">
                          <div
                            className={`w-16 h-16 rounded-[24px] flex items-center justify-center ${
                              isTargeted
                                ? "bg-emerald-50 text-emerald-500"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {packet.visualTriage ? (
                              <AlertCircle size={32} />
                            ) : (
                              <UserCircle size={32} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-black text-xl text-slate-900">
                                {packet.patientName}
                              </h4>
                              {isTargeted && (
                                <span className="bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                  Matches Your Specialty
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              {packet.suggestedSpecialty} •{" "}
                              {new Date(packet.timestamp).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl text-slate-300 group-hover:text-indigo-600 transition-colors">
                          <ChevronRight size={24} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* PHARMACY VIEW */}
        {userRole === "PHARMACY" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-800">
                Pharmacy Loop
              </h2>
              <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-full uppercase tracking-widest border border-amber-100">
                {pharmacyProfile?.name}
              </div>
            </div>

            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white rounded-[48px] p-24 text-center border border-slate-100 shadow-sm">
                  <ShoppingBag
                    size={64}
                    className="mx-auto mb-8 text-slate-200"
                  />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                    No prescriptions in queue
                  </p>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-xl"
                  >
                    {order.status === "READY" && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-6 py-2 rounded-bl-3xl uppercase tracking-widest shadow-lg">
                        In Stock / Ready
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <div className="bg-amber-50 p-4 rounded-3xl text-amber-600">
                          <ClipboardList size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Patient Name
                          </p>
                          <h3 className="text-2xl font-black text-slate-900">
                            {order.patientName}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Auth Code
                        </p>
                        <p className="text-sm font-black text-slate-700 font-mono tracking-tighter bg-slate-50 px-3 py-1 rounded-xl">
                          #{order.id.split("-")[1]}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 mb-8 shadow-inner">
                      <h4 className="text-xl font-black text-indigo-600 mb-3">
                        {order.medication}
                      </h4>
                      <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                        {order.instruction}
                      </p>
                    </div>

                    {order.status === "RECEIVED" ? (
                      <button
                        onClick={() =>
                          setOrders((prev) =>
                            prev.map((o) =>
                              o.id === order.id ? { ...o, status: "READY" } : o
                            )
                          )
                        }
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest"
                      >
                        <CheckCircle2 size={24} /> Mark as Ready for Pickup
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setShowQR(true)}
                          className="bg-white border-2 border-slate-100 text-slate-700 font-black py-4 rounded-[28px] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all uppercase tracking-widest"
                        >
                          <QrCode size={20} /> Verify
                        </button>
                        <button
                          onClick={() =>
                            setOrders((prev) =>
                              prev.filter((o) => o.id !== order.id)
                            )
                          }
                          className="bg-emerald-600 text-white font-black py-4 rounded-[28px] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all uppercase tracking-widest"
                        >
                          <Check size={20} /> Collected
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Patient Selector Overlay */}
      {showPatientSelector && <SelectPatientModal />}

      {/* QR Overlay */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"
            onClick={() => setShowQR(false)}
          ></div>
          <div className="bg-white rounded-[64px] p-12 max-w-sm w-full relative z-10 text-center space-y-10 animate-in zoom-in duration-300 shadow-2xl">
            <div className="bg-slate-50 p-10 rounded-[48px] border-2 border-slate-100 flex justify-center shadow-inner relative">
              <div className="w-48 h-48 bg-slate-900 rounded-[32px] overflow-hidden relative flex flex-wrap p-4">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-[10%] w-[10%] ${
                      Math.random() > 0.4 ? "bg-white" : "bg-transparent"
                    }`}
                  ></div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-5 rounded-3xl shadow-2xl border border-slate-100">
                    <ShieldCheck size={40} className="text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-800">Auth Code</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-3">
                Scan at pharmacy terminal
              </p>
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase tracking-widest shadow-xl shadow-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ConnectivitySim state={network} onStateChange={setNetwork} />

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        .font-inter { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
};

export default App;
