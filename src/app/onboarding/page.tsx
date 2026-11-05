"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Globe,
  GraduationCap,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const SUGGESTED_CAREER_INTERESTS = [
  "AI Systems Engineering",
  "Full-Stack Software Development",
  "Data Science & Machine Learning",
  "Cloud & DevOps Engineering",
  "Cybersecurity",
  "Product Management",
  "Quantitative Finance",
  "Academic & Scientific Research",
  "Embedded Systems & Robotics",
  "UI/UX & Product Design",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // All 11 mandatory Phase 1 onboarding fields
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("India");
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("B.Tech");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [academicYear, setAcademicYear] = useState("3rd Year (2026-2027)");
  const [semester, setSemester] = useState<number>(5);
  const [careerInterests, setCareerInterests] = useState<string[]>([
    "AI Systems Engineering",
    "Full-Stack Software Development",
  ]);
  const [customInterest, setCustomInterest] = useState("");
  const [learningGoals, setLearningGoals] = useState(
    "Master core semester subjects, build 2 portfolio-ready projects, and prepare for upcoming technical internships."
  );
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [persona, setPersona] = useState<
    | "confused_fresher"
    | "ambitious_builder"
    | "overwhelmed_organizer"
    | "research_explorer"
  >("ambitious_builder");
  const [dailyStudyHours, setDailyStudyHours] = useState<number>(3.5);

  useEffect(() => {
    async function loadCurrentProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const { profile } = await res.json();
          if (profile) {
            if (profile.fullName) setFullName(profile.fullName);
            if (profile.country) setCountry(profile.country);
            if (profile.institution) setInstitution(profile.institution);
            if (profile.degree) setDegree(profile.degree);
            if (profile.department) setDepartment(profile.department);
            if (profile.academicYear) setAcademicYear(profile.academicYear);
            if (profile.semester) setSemester(profile.semester);
            if (
              Array.isArray(profile.careerInterests) &&
              profile.careerInterests.length > 0
            ) {
              setCareerInterests(profile.careerInterests);
            }
            if (profile.learningGoals) setLearningGoals(profile.learningGoals);
            if (profile.preferredLanguage)
              setPreferredLanguage(profile.preferredLanguage);
            if (profile.timezone) setTimezone(profile.timezone);
            if (profile.persona) setPersona(profile.persona);
            if (profile.dailyStudyHours)
              setDailyStudyHours(profile.dailyStudyHours);
          }
        }
      } catch {
        // Keep defaults
      } finally {
        setLoadingProfile(false);
      }
    }
    loadCurrentProfile();
  }, []);

  function toggleCareerInterest(interest: string) {
    setCareerInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  }

  function handleAddCustomInterest() {
    const trimmed = customInterest.trim();
    if (!trimmed) return;
    if (!careerInterests.includes(trimmed)) {
      setCareerInterests((prev) => [...prev, trimmed]);
    }
    setCustomInterest("");
  }

  function validateCurrentStep(): boolean {
    setError("");
    if (step === 1) {
      if (fullName.trim().length < 2) {
        setError("Please enter your full name (at least 2 characters).");
        return false;
      }
      if (!country.trim() || !preferredLanguage.trim() || !timezone.trim()) {
        setError("Please complete country, preferred language, and time zone.");
        return false;
      }
    } else if (step === 2) {
      if (institution.trim().length < 2) {
        setError("Please enter your college or university name.");
        return false;
      }
      if (!degree.trim() || !department.trim() || !academicYear.trim()) {
        setError(
          "Please complete your degree, department, and current academic year."
        );
        return false;
      }
      if (semester < 1 || semester > 16) {
        setError("Semester must be between 1 and 16.");
        return false;
      }
    } else if (step === 3) {
      if (careerInterests.length === 0) {
        setError("Please select or add at least one career interest.");
        return false;
      }
      if (learningGoals.trim().length < 5) {
        setError("Please describe your learning goals.");
        return false;
      }
    }
    return true;
  }

  async function handleCompleteOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          country,
          institution,
          degree,
          department,
          academicYear,
          semester,
          careerInterests,
          learningGoals,
          preferredLanguage,
          timezone,
          careerGoal: careerInterests[0] || "Software & AI Engineer",
          persona,
          dailyStudyHours,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to save onboarding profile.");
        setSubmitting(false);
        return;
      }

      router.push(data.redirectTo || "/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error while completing onboarding."
      );
      setSubmitting(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-text-secondary">
            Loading your Student OS onboarding profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-button bg-primary flex items-center justify-center text-white font-bold shadow-sm">
              OS
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                Student OS Onboarding
              </h1>
              <p className="text-xs text-text-secondary">
                Configure your AI CEO and 15 specialist agents with your
                academic & career context
              </p>
            </div>
          </div>
          <Badge variant="default">Step {step} of 3</Badge>
        </div>

        {/* Progress Bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1, label: "1. Identity & Locale", icon: Globe },
            { num: 2, label: "2. Academic Profile", icon: GraduationCap },
            { num: 3, label: "3. Career & Learning", icon: Compass },
          ].map((item) => {
            const active = step >= item.num;
            return (
              <div
                key={item.num}
                className={`p-3 rounded-button border text-xs font-semibold flex items-center gap-2 transition ${
                  active
                    ? "border-primary bg-blue-50/70 text-primary"
                    : "border-border bg-surface text-text-secondary"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Personal Identity, Language & Time Zone"}
              {step === 2 && "College, Degree & Semester Details"}
              {step === 3 && "Career Interests & Learning Goals"}
            </CardTitle>
            <CardDescription>
              {step === 1 &&
                "Your AI CEO uses your preferred language and time zone to schedule daily briefings and study blocks."}
              {step === 2 &&
                "The Academic, Study, Tutor, and Exam agents align their plans to your university, degree, academic year, and semester."}
              {step === 3 &&
                "The Career, Skill, Project, and Opportunity agents tailor roadmaps and internships to your interests and learning goals."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4">
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            <form onSubmit={handleCompleteOnboarding} className="space-y-5">
              {/* STEP 1: Full Name, Country, Preferred Language, Timezone */}
              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Aarav Sharma"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="flex h-10 w-full rounded-button border border-border bg-surface px-3.5 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:border-primary"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Canada">Canada</option>
                      <option value="Germany">Germany</option>
                      <option value="Australia">Australia</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="preferredLanguage">
                      Preferred Language *
                    </Label>
                    <select
                      id="preferredLanguage"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="flex h-10 w-full rounded-button border border-border bg-surface px-3.5 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:border-primary"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                      <option value="Marathi">Marathi (मराठी)</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="timezone">Time Zone *</Label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="flex h-10 w-full rounded-button border border-border bg-surface px-3.5 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:border-primary"
                    >
                      <option value="Asia/Kolkata">
                        Asia/Kolkata (IST, UTC+05:30)
                      </option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">
                        America/New_York (EST/EDT)
                      </option>
                      <option value="America/Los_Angeles">
                        America/Los_Angeles (PST/PDT)
                      </option>
                      <option value="Europe/London">
                        Europe/London (GMT/BST)
                      </option>
                      <option value="Asia/Singapore">
                        Asia/Singapore (SGT, UTC+08:00)
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: College/University, Degree, Department, Current Academic Year, Semester */}
              {step === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="institution">College / University *</Label>
                    <Input
                      id="institution"
                      required
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g., Indian Institute of Technology (IIT) Delhi"
                    />
                  </div>

                  <div>
                    <Label htmlFor="degree">Degree *</Label>
                    <Input
                      id="degree"
                      required
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g., B.Tech / B.E. / B.Sc / MBA"
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Department / Major *</Label>
                    <Input
                      id="department"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., Computer Science & Engineering"
                    />
                  </div>

                  <div>
                    <Label htmlFor="academicYear">Current Academic Year *</Label>
                    <select
                      id="academicYear"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="flex h-10 w-full rounded-button border border-border bg-surface px-3.5 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:border-primary"
                    >
                      <option value="1st Year (2026-2027)">
                        1st Year (2026-2027)
                      </option>
                      <option value="2nd Year (2026-2027)">
                        2nd Year (2026-2027)
                      </option>
                      <option value="3rd Year (2026-2027)">
                        3rd Year (2026-2027)
                      </option>
                      <option value="4th Year (2026-2027)">
                        4th Year (2026-2027)
                      </option>
                      <option value="5th Year / Dual Degree (2026-2027)">
                        5th Year / Dual Degree (2026-2027)
                      </option>
                      <option value="Postgraduate / Masters (2026-2027)">
                        Postgraduate / Masters (2026-2027)
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="semester">Current Semester (1–16) *</Label>
                    <Input
                      id="semester"
                      type="number"
                      min={1}
                      max={16}
                      required
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Career Interests & Learning Goals */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label>
                      Career Interests * (Select one or more, or add your own)
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SUGGESTED_CAREER_INTERESTS.map((interest) => {
                        const selected = careerInterests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleCareerInterest(interest)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                              selected
                                ? "bg-primary text-white border-primary"
                                : "bg-surface-muted text-text-primary border-border hover:border-primary"
                            }`}
                          >
                            {selected ? `✓ ${interest}` : `+ ${interest}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Input
                        value={customInterest}
                        onChange={(e) => setCustomInterest(e.target.value)}
                        placeholder="Add custom career interest (e.g., Bioinformatics)..."
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddCustomInterest}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="learningGoals">Learning Goals *</Label>
                    <textarea
                      id="learningGoals"
                      rows={3}
                      required
                      value={learningGoals}
                      onChange={(e) => setLearningGoals(e.target.value)}
                      placeholder="Describe what you want to achieve this semester (e.g., master DSA, raise SGPA above 9.0, ship 2 AI portfolio projects)..."
                      className="w-full rounded-button border border-border bg-surface p-3 text-sm text-text-primary focus-visible:outline-none focus-visible:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="persona">Student Persona</Label>
                      <select
                        id="persona"
                        value={persona}
                        onChange={(e) =>
                          setPersona(
                            e.target.value as
                              | "confused_fresher"
                              | "ambitious_builder"
                              | "overwhelmed_organizer"
                              | "research_explorer"
                          )
                        }
                        className="flex h-10 w-full rounded-button border border-border bg-surface px-3.5 py-2 text-sm text-text-primary"
                      >
                        <option value="confused_fresher">
                          Confused Fresher (Needs direction & study routine)
                        </option>
                        <option value="ambitious_builder">
                          Ambitious Student (Skills, projects & internships)
                        </option>
                        <option value="overwhelmed_organizer">
                          Overwhelmed Student (Deadlines & exam organisation)
                        </option>
                        <option value="research_explorer">
                          Research-Oriented Student (Papers & knowledge base)
                        </option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="dailyStudyHours">
                        Daily Focused Study Target (Hours)
                      </Label>
                      <Input
                        id="dailyStudyHours"
                        type="number"
                        step="0.5"
                        min={1}
                        max={14}
                        value={dailyStudyHours}
                        onChange={(e) =>
                          setDailyStudyHours(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setStep((prev) => (prev === 3 ? 2 : 1) as 1 | 2 | 3)
                    }
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (validateCurrentStep()) {
                        setStep((prev) => (prev === 1 ? 2 : 3) as 1 | 2 | 3);
                      }
                    }}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting}>
                    <Sparkles className="h-4 w-4" />
                    {submitting
                      ? "Initialising Student OS..."
                      : "Complete Onboarding & Launch Student OS"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

