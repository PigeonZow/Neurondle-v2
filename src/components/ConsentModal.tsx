'use client'

import { useState } from 'react'
import { Users, FileText, Database, Shield, AlertCircle, Mail } from 'lucide-react'
import { useConsentStore } from '@/lib/store/consentStore'
import { getSessionToken } from '@/lib/services/sessions'

export function ConsentModal() {
  const [checked, setChecked] = useState(false)
  const { consentStatus, setConsentStatus } = useConsentStore()

  if (consentStatus !== 'pending') return null

  const handleAccept = () => {
    setConsentStatus('accepted')
  }

  const handleDecline = () => {
    setConsentStatus('declined')
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className="flex flex-col w-full max-w-2xl max-h-[85vh] bg-[#16213e] rounded-xl shadow-2xl overflow-hidden">

        {/* Fixed header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src="/sfu.png" alt="Simon Fraser University" className="h-8 pb-1" />
            <div>
              <h2 className="text-lg font-semibold text-white">Research Participation - Neurondle</h2>
              <p className="text-sm text-gray-400">Simon Fraser University</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0">

          {/* Section 1: Research Invitation */}
          <section className="pb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary-400 flex-shrink-0" />
              <h3 className="font-semibold text-base text-white">Research Invitation</h3>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-100">You are invited to participate in research</h4>
              <p className="text-sm text-gray-300">
                This study is being conducted by researchers at Simon Fraser University
                to better understand how people interact with AI interpretability tools.
                You are invited to participate because you are using Neurondle, our
                interactive AI neuron discovery game.
              </p>
              <div className="bg-yellow-950/40 border border-yellow-700/50 rounded p-3">
                <p className="text-sm text-yellow-200">
                  <strong className="text-yellow-100">The game functions identically whether you participate in research or not.</strong>{' '}
                  Your choice only affects whether we collect anonymized data about your gameplay. This consent dialog will take &lt; 2 minutes to read.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-700" />

          {/* Section 2: Study Purpose & Procedures */}
          <section className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary-400 flex-shrink-0" />
              <h3 className="font-semibold text-base text-white">Study Purpose &amp; Procedures</h3>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-100">Research Purpose</h4>
              <p className="text-sm text-gray-300">
                We want to understand how people understand AI systems through games like Neurondle, which may help people design future tools related to AI interpretability.
              </p>
              <h4 className="font-semibold text-gray-100">What would happen if you participate?</h4>
              <p className="text-sm text-gray-300">
                If you choose to participate, we will collect anonymized data about
                your gameplay as you normally use Neurondle, which also may be used in research publications and student theses. A game of Neurondle takes anywhere from 1 to 15 minutes, depending on your number of guesses.
              </p>
            </div>
          </section>

          <hr className="border-gray-700" />

          {/* Section 3: Data Collection and Withdrawal */}
          <section className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-primary-400 flex-shrink-0" />
              <h3 className="font-semibold text-base text-white">Data Collection and Withdrawal</h3>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-100">What information will be collected?</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="text-sm text-gray-300">
                    <p>The labels you submit, metadata about your custom text (not the actual text content), how close your guesses were, activation scores, playtime, and other gameplay data</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-950/40 border border-yellow-700/50 rounded p-3 mt-0">
                <h5 className="font-medium text-yellow-100 text-sm mb-1">What we DON'T collect:</h5>
                <ul className="text-xs text-yellow-200 space-y-1">
                  <li>• Your custom text inputs (the actual text you type to test activations)</li>
                  <li>• Any personally identifying information</li>
                  <li>• Your IP address or device fingerprinting beyond session management</li>
                  <li>• Information about other websites you visit</li>
                </ul>
              </div>

              <h4 className="font-semibold text-gray-100">How can you withdraw your data?</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="text-sm text-gray-300">
                    <p>You can withdraw your data by contacting the research team (information on final page), but after the data is anonymized and uploaded to research data sharing platforms it may not be possible to remove it from other systems that have already accessed it.</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-950/40 border border-blue-700/50 rounded p-3 mt-3">
                <p className="text-xs text-blue-300 mb-2">
                  Reference this ID if you need to withdraw your data:
                </p>
                <code className="text-xs bg-blue-950 text-blue-300 px-2 py-1 rounded font-mono break-all block mb-2">
                  {getSessionToken()}
                </code>
                <p className="text-xs text-blue-400">
                  This ID is also displayed in the bottom-right corner of the game for future reference.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-700" />

          {/* Section 4: Privacy & Data Security */}
          <section className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary-400 flex-shrink-0" />
              <h3 className="font-semibold text-base text-white">Privacy &amp; Data Security</h3>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-100">How will your privacy be protected?</h4>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• All data is collected anonymously - we cannot identify individual participants</li>
                <li>• No personal information is linked to your gameplay data</li>
              </ul>
              <h4 className="font-semibold text-gray-100">Data storage and retention</h4>
              <p className="text-sm text-gray-300">
                Anonymized data will be made available in open research repositories indefinitely.
              </p>
            </div>
          </section>

          <hr className="border-gray-700" />

          {/* Section 5: Risks & Benefits */}
          <section className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-primary-400 flex-shrink-0" />
              <h3 className="font-semibold text-base text-white">Risks &amp; Benefits</h3>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-100">Are there any risks?</h4>
              <p className="text-sm text-gray-300">
                There are no foreseeable risks beyond those of normal computer use.
                The research involves only passive collection of anonymized gameplay data.
              </p>
              <h4 className="font-semibold text-gray-100">Are there any benefits?</h4>
              <p className="text-sm text-gray-300">
                There are no direct benefits to you from participating in this research, besides having fun playing the game.
                However, the knowledge gained may help improve tools and
                benefit future users of similar systems.
              </p>
              <h4 className="font-semibold text-gray-100">Compensation</h4>
              <p className="text-sm text-gray-300">
                You will not receive any payment or compensation for participating
                in this research.
              </p>
            </div>
          </section>

          <hr className="border-gray-700" />

          {/* Section 6: Your Rights & Contacts */}
          <section className="pt-6 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-primary-400 flex-shrink-0" />
              <h3 className="font-semibold text-base text-white">Your Rights &amp; Contacts</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base text-gray-100 mb-2">Your participation is voluntary</h4>
                <p className="text-sm text-gray-300">
                  You are under no obligation to participate.
                </p>
                <p className="text-sm text-gray-300 mt-2">
                  By consenting to participate in this research, you have not waived any rights to legal recourse in the event of research-related harm.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-100">Withdrawal / Questions About Study</h4>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p><strong className="text-gray-100">Study Number:</strong> #30003279</p>
                    <br />
                    <p><strong className="text-gray-100">PI:</strong> Nicholas Vincent</p>
                    <p><strong className="text-gray-100">Email:</strong> nvincent@sfu.ca</p>
                    <br />
                    <p><strong className="text-gray-100">Student Lead:</strong> Patrick Zhao</p>
                    <p><strong className="text-gray-100">Email:</strong> pza28@sfu.ca</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-100">Concerns About Your Rights</h4>
                  <div className="text-xs bg-blue-950/40 border border-blue-700/50 rounded p-3">
                    <p className="text-blue-100"><strong>SFU Research Ethics Office</strong></p>
                    <p className="text-blue-200">hreb@sfu.ca • 778-782-6593</p>
                    <p className="text-xs text-blue-400 mt-1">
                      Contact if you have concerns about your rights as a research participant
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-950/40 border border-yellow-700/50 rounded p-3">
                <p className="text-sm text-yellow-200">
                  Remember, the game works identically
                  whether you participate in research or not.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Fixed footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-700 bg-[#16213e]">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleDecline}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Decline
            </button>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
                />
                <span className="text-xs text-gray-300">I have all read the above and am over 18</span>
              </label>

              <button
                onClick={handleAccept}
                disabled={!checked}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  checked
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Accept
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
