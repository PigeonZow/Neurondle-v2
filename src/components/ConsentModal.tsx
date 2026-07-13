"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConsentStore } from "@/lib/store/consentStore";
import { getSessionToken } from "@/lib/services/sessions";

export function ConsentModal() {
  const [checked, setChecked] = useState(false);
  const { consentStatus, isModalOpen, setConsentStatus, closeModal } =
    useConsentStore();

  const alreadyDecided = consentStatus !== "pending";

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          key="consent-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="relative flex flex-col w-full max-w-2xl max-h-[88vh] bg-game-surface rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden ring-1 ring-white/5"
          >
            {/* signature accent strip */}
            <div className="h-[2px] bg-gradient-to-r from-primary-500 via-primary-400 to-game-highlight" />

            {/* Header */}
            <div className="flex-shrink-0 px-7 pt-6 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src="/sfu.png"
                    alt="Simon Fraser University"
                    className="h-8 shrink-0"
                  />
                  <div className="min-w-0 leading-none">
                    <h2 className="text-xl font-bold tracking-tight leading-none">
                      <span className="text-primary-400">Neuron</span>
                      <span className="text-game-highlight">dle</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Research Participation · Simon Fraser University
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-200 font-mono">
                      Study
                    </p>
                    <p className="text-xs font-mono text-gray-300 mt-0.5">
                      #30003279
                    </p>
                  </div>
                  {alreadyDecided && (
                    <button
                      onClick={closeModal}
                      aria-label="Close"
                      className="ml-2 w-7 h-7 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-7 pb-2">
              <div className="space-y-7">
                {/* Section 01: Research Invitation */}
                <Section num="01" label="Research Invitation">
                  <Heading>You are invited to participate in research</Heading>
                  <p>
                    This study is being conducted by researchers at Simon Fraser
                    University to better understand how people interact with AI
                    interpretability tools. You are invited to participate
                    because you are using Neurondle, our interactive AI neuron
                    discovery game.
                  </p>
                  <Callout>
                    <span className="text-white font-medium">
                      The game functions identically whether you participate in research or not.
                    </span>{' '}
                    Your choice only affects whether we collect anonymous data about your gameplay. This consent dialog will take &lt; 2 minutes to read.
                  </Callout>
                </Section>

                {/* Section 02: Study Purpose & Procedures */}
                <Section num="02" label="Study Purpose & Procedures">
                  <Heading>Research Purpose</Heading>
                  <p>
                    We want to understand how people understand AI systems
                    through games like Neurondle, which may help people design
                    future tools related to AI interpretability.
                  </p>
                  <Heading className="mt-4">
                    What would happen if you participate?
                  </Heading>
                  <p>
                    If you choose to participate, we will collect anonymous data about
                    your gameplay as you normally use Neurondle, which also may be used in research publications and student theses. A game of Neurondle takes anywhere from 1 to 15 minutes, depending on your number of guesses.
                  </p>
                </Section>

                {/* Section 03: Data Collection and Withdrawal */}
                <Section num="03" label="Data Collection and Withdrawal">
                  <Heading>What information will be collected?</Heading>
                  <p>
                    The labels you submit, metadata about your custom text (not
                    the actual text content), how close your guesses were,
                    activation scores, playtime, and other gameplay data.
                  </p>

                  <Callout className="mt-3">
                    <p className="text-white font-medium mb-1.5">
                      What we{" "}
                      <span className="text-game-highlight">do not</span>{" "}
                      collect:
                    </p>
                    <ul className="space-y-1 text-gray-300 text-sm">
                      <Bullet>Any personally identifying information</Bullet>
                      <Bullet>
                        Your IP address or device fingerprinting beyond session
                        management
                      </Bullet>
                      <Bullet>
                        Information about other websites you visit
                      </Bullet>
                    </ul>
                  </Callout>

                  <Heading className="mt-4">
                    How can you withdraw your data?
                  </Heading>
                  <p>
                    You can withdraw your data by contacting the research team (information on final page), but after the data is anonymous and uploaded to research data sharing platforms it may not be possible to remove it from other systems that have already accessed it.
                  </p>

                  <div className="mt-3">
                    <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-gray-200 mb-1.5">
                      Withdrawal reference
                    </p>
                    <div className="bg-game-bg rounded-lg border border-white/5 px-3 py-2.5 flex items-center justify-between gap-3">
                      <code className="text-xs font-mono text-primary-300 break-all">
                        {getSessionToken()}
                      </code>
                      <span className="text-[10px] uppercase tracking-wider font-mono text-gray-200 shrink-0">
                        session
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      This ID is also displayed in the bottom-right corner of
                      the game for future reference.
                    </p>
                  </div>
                </Section>

                {/* Section 04: Privacy & Data Security */}
                <Section num="04" label="Privacy & Data Security">
                  <Heading>How will your privacy be protected?</Heading>
                  <ul className="space-y-1.5 text-gray-300 text-sm">
                    <Bullet>
                      All data is collected anonymously — we cannot identify
                      individual participants
                    </Bullet>
                    <Bullet>
                      No personal information is linked to your gameplay data
                    </Bullet>
                  </ul>
                  <Heading className="mt-4">Data storage and retention</Heading>
                  <p>
                    Anonymous data will be made available in open research repositories indefinitely.
                  </p>
                </Section>

                {/* Section 05: Risks & Benefits */}
                <Section num="05" label="Risks & Benefits">
                  <Heading>Are there any risks?</Heading>
                  <p>
                    There are no foreseeable risks beyond those of normal computer use.
                    The research involves only passive collection of anonymous gameplay data.
                  </p>
                  <Heading className="mt-4">Are there any benefits?</Heading>
                  <p>
                    There are no direct benefits to you from participating in
                    this research, besides having fun playing the game. However,
                    the knowledge gained may help improve tools and benefit
                    future users of similar systems.
                  </p>
                  <Heading className="mt-4">Compensation</Heading>
                  <p>
                    You will not receive any payment or compensation for
                    participating in this research.
                  </p>
                </Section>

                {/* Section 06: Your Rights & Contacts */}
                <Section num="06" label="Your Rights & Contacts">
                  <Heading>Your participation is voluntary</Heading>
                  <p>You are under no obligation to participate.</p>
                  <p>
                    By consenting to participate in this research, you have not
                    waived any rights to legal recourse in the event of
                    research-related harm.
                  </p>

                  <div className="mt-5 grid sm:grid-cols-2 gap-3">
                    <ContactCard heading="Withdrawal / Questions About Study">
                      <ContactRow label="Study">#30003279</ContactRow>
                      <div className="h-1.5" />
                      <ContactRow label="PI">Nicholas Vincent</ContactRow>
                      <ContactRow label="Email">nvincent@sfu.ca</ContactRow>
                      <div className="h-1.5" />
                      <ContactRow label="Lead">Patrick Zhao</ContactRow>
                      <ContactRow label="Email">pza28@sfu.ca</ContactRow>
                      <div className="h-1.5" />
                      <ContactRow label="RA">Ananya Singh</ContactRow>
                      <ContactRow label="Email">asa522@sfu.ca</ContactRow>
                    </ContactCard>

                    <ContactCard heading="Concerns About Your Rights">
                      <ContactRow label="Office">
                        SFU Research Ethics
                      </ContactRow>
                      <ContactRow label="Email">hreb@sfu.ca</ContactRow>
                      <ContactRow label="Phone">778-782-6593</ContactRow>
                      <p className="text-[11px] text-gray-400 mt-2 leading-snug">
                        Contact if you have concerns about your rights as a
                        research participant.
                      </p>
                    </ContactCard>
                  </div>

                  <Callout className="mt-5">
                    Remember, the game works identically whether you participate
                    in research or not.
                  </Callout>
                </Section>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-7 py-4 border-t border-white/5 bg-game-surface">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setConsentStatus("declined")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
                >
                  {alreadyDecided && consentStatus === "accepted"
                    ? "Opt out"
                    : "Decline"}
                </button>

                <div className="flex items-center gap-3 ml-auto">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary-500 cursor-pointer"
                    />
                    <span className="text-xs text-gray-400">
                      I have read all the above and am over 18
                    </span>
                  </label>

                  <button
                    onClick={() => setConsentStatus("accepted")}
                    disabled={!checked}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight ${
                      checked
                        ? "bg-primary-600 hover:bg-primary-500 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.3)]"
                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {alreadyDecided && consentStatus === "declined"
                      ? "Opt in"
                      : "Accept"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  num,
  label,
  children,
}: {
  num: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-4">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-200">
          {num} <span className="text-gray-700">/</span> {label}
        </span>
      </div>
      <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Heading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h4 className={`text-base font-semibold text-white ${className}`}>
      {children}
    </h4>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className="mt-2 h-1 w-1 rounded-full bg-gray-600 shrink-0"
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

function Callout({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative bg-game-bg/80 rounded-lg pl-4 pr-4 py-3 overflow-hidden ${className}`}
    >
      <span className="absolute inset-y-0 left-0 w-[2px] bg-game-highlight" />
      <div className="text-sm text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

function ContactCard({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-game-bg/60 rounded-lg border border-white/5 p-3.5">
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-gray-200 mb-2">
        {heading}
      </p>
      <div className="space-y-1 text-xs">{children}</div>
    </div>
  );
}

function ContactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-200 w-12 shrink-0 font-mono text-[10px] uppercase tracking-wider pt-px">
        {label}
      </span>
      <span className="text-gray-200">{children}</span>
    </div>
  );
}
