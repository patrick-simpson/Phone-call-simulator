import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Phone, PhoneOff, Shield, Printer, Clock, Terminal, Users, FileText,
  CheckCircle, XCircle, AlertTriangle, Lock, ChevronRight, RotateCcw,
  Wifi, WifiOff, RefreshCw, Star, Activity,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TERMINAL_OUTPUTS = {
  ping_printer: [
    '> ping 192.168.1.42 -n 4',
    '',
    'Pinging PRINTER-EXEC-01 [192.168.1.42] with 32 bytes of data:',
    'Request timed out.',
    'Request timed out.',
    'Request timed out.',
    'Request timed out.',
    '',
    'Ping statistics for 192.168.1.42:',
    '    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)',
    '',
    '>>> NETWORK FAULT CONFIRMED — HOST UNREACHABLE <<<',
  ],
  flush_dns: [
    '> ipconfig /flushdns',
    '',
    'Windows IP Configuration',
    '',
    'Successfully flushed the DNS Resolver Cache.',
  ],
  ping_generic: [
    '> ping gateway.corp -n 4',
    '',
    'Pinging gateway.corp [10.0.0.1] with 32 bytes of data:',
    'Reply from 10.0.0.1: bytes=32 time=1ms TTL=64',
    'Reply from 10.0.0.1: bytes=32 time=1ms TTL=64',
    'Reply from 10.0.0.1: bytes=32 time=2ms TTL=64',
    'Reply from 10.0.0.1: bytes=32 time=1ms TTL=64',
    '',
    'Ping statistics for 10.0.0.1:',
    '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)',
    '    Approximate round trip times in milli-seconds:',
    '        Minimum = 1ms, Maximum = 2ms, Average = 1ms',
  ],
}

const SCENARIOS = {
  1: {
    id: 1,
    title: 'The Broken Printer',
    description: 'An executive SVP needs to print before a board meeting. The main floor printer is dead.',
    icon: 'printer',
    caller: {
      name: 'Richard Harmon',
      department: 'Executive Suite',
      role: 'SVP of Sales',
      tier: 'VIP',
      assetTag: 'PRN-0042',
    },
    initialPatience: 100,
    idealTicket: {
      category: 'Hardware',
      priority: 'High',
      noteKeywords: ['ping', 'redirect', 'floor 3', 'packet loss', 'orange'],
    },
    adUsers: [
      { id: 'rharmon', name: 'Richard Harmon', dept: 'Sales', status: 'active' },
      { id: 'jsmith',  name: 'John Smith',     dept: 'IT',    status: 'active' },
      { id: 'mlee',    name: 'Mary Lee',        dept: 'HR',    status: 'active' },
      { id: 'kpatel',  name: 'Kavya Patel',     dept: 'Sales', status: 'active' },
    ],
    nodes: {
      start: {
        id: 'start',
        speaker: 'caller',
        text: "Hello?! Is this IT support? I'm Richard Harmon, SVP of Sales, and I cannot print a single page. I have a board presentation in 20 minutes and the printer is completely dead. Fix this NOW.",
        choices: [
          {
            label: "I understand the urgency, Mr. Harmon. Let me check the printer status right away. Can you describe the indicator light on the printer?",
            nextNode: 'check_power',
            patienceEffect: 0,
            transcriptTag: 'professional',
          },
          {
            label: "Have you tried turning it off and on again?",
            nextNode: 'check_power',
            patienceEffect: -20,
            transcriptTag: 'dismissive',
            penaltyNote: 'Dismissive — patience reduced',
          },
          {
            label: "Printers can be tricky. What's the ticket priority you'd assign this?",
            nextNode: 'check_power',
            patienceEffect: -15,
            transcriptTag: 'deflecting',
            penaltyNote: 'Deflecting with process — patience reduced',
          },
        ],
      },
      check_power: {
        id: 'check_power',
        speaker: 'caller',
        text: "There's a solid orange light blinking on the front panel. I already tried cycling the power three times — it's not a paper jam, I already checked.",
        choices: [
          {
            label: "Orange blinking usually signals a firmware or network connectivity fault. I'll run a network ping test on the printer now to confirm.",
            nextNode: 'ping_test',
            patienceEffect: 5,
            transcriptTag: 'professional',
          },
          {
            label: "Try cycling the power again, sometimes it takes a few tries.",
            nextNode: 'ping_result',
            patienceEffect: -25,
            transcriptTag: 'bad_advice',
            penaltyNote: 'Suggested reset user already tried — patience reduced',
          },
          {
            label: "Is the paper tray fully loaded? Sometimes that causes orange lights.",
            nextNode: 'ping_result',
            patienceEffect: -10,
            transcriptTag: 'off_topic',
            penaltyNote: 'Off-topic suggestion — patience reduced',
          },
        ],
      },
      ping_test: {
        id: 'ping_test',
        speaker: 'system',
        text: 'Action: Run a network ping on PRINTER-EXEC-01 (192.168.1.42) to verify connectivity.',
        choices: [
          {
            label: '[ Run Ping Test in Network Terminal ]',
            nextNode: 'ping_result',
            patienceEffect: 0,
            transcriptTag: 'action',
            requiresTerminalAction: 'ping_printer',
          },
        ],
      },
      ping_result: {
        id: 'ping_result',
        speaker: 'caller',
        text: "Well? What did you find? My meeting starts in 15 minutes.",
        choices: [
          {
            label: "The ping confirms 100% packet loss — the printer has completely dropped off the network. I can redirect your print job to the floor 3 backup printer immediately.",
            nextNode: 'redirect_print',
            patienceEffect: 10,
            transcriptTag: 'professional',
          },
          {
            label: "The results are... inconclusive. Let me check a few more logs.",
            nextNode: 'redirect_print',
            patienceEffect: -15,
            transcriptTag: 'uncertain',
            penaltyNote: 'Vague diagnosis — patience reduced',
          },
        ],
      },
      redirect_print: {
        id: 'redirect_print',
        speaker: 'caller',
        text: "Floor 3?! That's all the way across the building. Is there nothing closer?",
        choices: [
          {
            label: "I understand that's inconvenient. I'm flagging this as High Priority and escalating to the hardware team immediately. The floor 3 workaround will get you through the presentation today.",
            nextNode: 'resolution',
            patienceEffect: 15,
            transcriptTag: 'professional',
          },
          {
            label: "I'm sorry, that's the best we can do right now.",
            nextNode: 'resolution',
            patienceEffect: -5,
            transcriptTag: 'passive',
            penaltyNote: 'Passive tone — slight patience reduction',
          },
        ],
      },
      resolution: {
        id: 'resolution',
        speaker: 'caller',
        text: "Fine. But I expect a full status report on this printer repair sent to my inbox by end of day. Not impressed with this situation.",
        choices: [],
        isResolution: true,
      },
    },
  },

  2: {
    id: 2,
    title: 'The Phishing Scare',
    description: 'An accounting employee clicked a suspicious link and may have exposed corporate credentials.',
    icon: 'shield',
    caller: {
      name: 'Sandra Chen',
      department: 'Accounting',
      role: 'Accounts Payable Specialist',
      tier: 'Standard',
      assetTag: 'WS-1138',
    },
    initialPatience: 75,
    idealTicket: {
      category: 'Security',
      priority: 'Critical',
      noteKeywords: ['phishing', 'disabled', 'escalat', 'disconnect', 'network', 'account'],
    },
    adUsers: [
      { id: 'schen',   name: 'Sandra Chen',    dept: 'Accounting', status: 'active' },
      { id: 'bwong',   name: 'Brian Wong',      dept: 'Accounting', status: 'active' },
      { id: 'admin01', name: 'IT Admin',        dept: 'IT',         status: 'active' },
      { id: 'lkumar',  name: 'Lena Kumar',      dept: 'Finance',    status: 'active' },
    ],
    nodes: {
      start: {
        id: 'start',
        speaker: 'caller',
        text: "Hi, um... I think I made a terrible mistake. I got an email that looked like it was from our bank, and I clicked a link. It took me to a login page that looked like our company portal, and I typed in my Windows password before I realized it might be fake. I'm really scared.",
        choices: [
          {
            label: "You did the right thing by calling immediately — that takes courage. Don't touch anything else on your screen. Can you tell me your username?",
            nextNode: 'calm_assess',
            patienceEffect: 5,
            transcriptTag: 'professional',
          },
          {
            label: "Why would you click a link like that? IT sends out phishing awareness training for a reason.",
            nextNode: 'calm_assess',
            patienceEffect: -30,
            transcriptTag: 'accusatory',
            penaltyNote: 'Accusatory tone — severe patience reduction',
          },
          {
            label: "Oh, that's probably fine — these fake login pages rarely actually capture credentials.",
            nextNode: 'calm_assess',
            patienceEffect: -15,
            transcriptTag: 'too_casual',
            penaltyNote: 'Downplayed serious security incident — patience reduced',
          },
        ],
      },
      calm_assess: {
        id: 'calm_assess',
        speaker: 'caller',
        text: "I'm Sandra Chen in Accounting. The email had the bank logo and everything, it looked so real. My computer is still on — should I turn it off?",
        choices: [
          {
            label: "No — don't shut down. We need the machine running for forensic analysis. First: physically unplug your ethernet cable or disable Wi-Fi right now. This isolates any threat immediately.",
            nextNode: 'disconnect_network',
            patienceEffect: 5,
            transcriptTag: 'professional',
          },
          {
            label: "Yes, go ahead and shut down your PC — that'll stop any malware from running.",
            nextNode: 'disconnect_network',
            patienceEffect: -10,
            transcriptTag: 'bad_advice',
            penaltyNote: 'Shutdown destroys forensic evidence — patience reduced',
          },
        ],
      },
      disconnect_network: {
        id: 'disconnect_network',
        speaker: 'caller',
        text: "Okay, I unplugged the ethernet cable. The internet icon has an X on it now. What do I do next?",
        choices: [
          {
            label: "Perfect — you've contained it. Now I'm disabling your Active Directory account to block the attacker from using your credentials while we investigate.",
            nextNode: 'lock_account',
            patienceEffect: 5,
            transcriptTag: 'professional',
          },
          {
            label: "Just go ahead and change your password when you can — that should be enough.",
            nextNode: 'lock_account',
            patienceEffect: -20,
            transcriptTag: 'bad_advice',
            penaltyNote: 'Password change insufficient for credential compromise — patience reduced',
          },
        ],
      },
      lock_account: {
        id: 'lock_account',
        speaker: 'system',
        text: "Action required: Disable Sandra Chen's AD account (schen) to prevent unauthorized access with stolen credentials.",
        choices: [
          {
            label: '[ Disable schen Account in Active Directory Hub ]',
            nextNode: 'account_locked',
            patienceEffect: 0,
            transcriptTag: 'action',
            requiresADAction: { userId: 'schen', action: 'disable' },
          },
        ],
      },
      account_locked: {
        id: 'account_locked',
        speaker: 'caller',
        text: "Did you lock my account? Am I going to be in trouble with my manager for this?",
        choices: [
          {
            label: "Your account is now disabled — no one can access it. You're not in trouble; phishing attacks fool everyone. I'm escalating this to our security team immediately and marking it Critical priority.",
            nextNode: 'resolution',
            patienceEffect: 10,
            transcriptTag: 'professional',
          },
          {
            label: "It's done. HR will likely want to speak with you about proper email safety.",
            nextNode: 'resolution',
            patienceEffect: -15,
            transcriptTag: 'threatening',
            penaltyNote: 'Threatened user with HR — patience reduced',
          },
        ],
      },
      resolution: {
        id: 'resolution',
        speaker: 'caller',
        text: "Thank you so much. I feel a lot better. You were really calm and that helped me calm down too. Please let me know what happens.",
        choices: [],
        isResolution: true,
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const calculateScore = (scenario, ticket, callerPatience, elapsedSeconds) => {
  const patience_pts = Math.round((callerPatience / 100) * 40)
  const time_pts = Math.max(0, 30 - Math.floor(elapsedSeconds / 60))

  const ideal = scenario.idealTicket
  let ticket_pts = 0
  if (ticket.category === ideal.category) ticket_pts += 10
  if (ticket.priority === ideal.priority) ticket_pts += 10
  const notesLower = (ticket.notes || '').toLowerCase()
  let keyword_pts = 0
  ideal.noteKeywords.forEach((kw) => {
    if (notesLower.includes(kw.toLowerCase())) {
      keyword_pts = Math.min(keyword_pts + 2, 10)
    }
  })
  ticket_pts += keyword_pts
  ticket_pts = Math.min(ticket_pts, 30)

  const total = Math.min(100, patience_pts + time_pts + ticket_pts)
  const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F'

  return { patience_pts, time_pts, ticket_pts, keyword_pts, total, grade }
}

const patienceColor = (p) => {
  if (p > 60) return 'bg-green-500'
  if (p > 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

const gradeColor = (g) => {
  if (g === 'A') return 'text-green-400'
  if (g === 'B') return 'text-cyan-400'
  if (g === 'C') return 'text-yellow-400'
  return 'text-red-400'
}

// ---------------------------------------------------------------------------
// StartScreen
// ---------------------------------------------------------------------------

function StartScreen({ onStart }) {
  const [selected, setSelected] = useState(null)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="p-3 bg-cyan-900/40 rounded-xl border border-cyan-700">
            <Phone className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Help Desk Simulator</h1>
        <p className="mt-2 text-gray-400 text-lg">Train your IT support skills. Handle real calls. Earn your grade.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
        {Object.values(SCENARIOS).map((scenario) => {
          const isSelected = selected === scenario.id
          return (
            <button
              key={scenario.id}
              onClick={() => setSelected(scenario.id)}
              className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-950/40 shadow-lg shadow-cyan-900/30'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-800/50' : 'bg-gray-800'}`}>
                  {scenario.icon === 'printer' ? (
                    <Printer className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                  ) : (
                    <Shield className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{scenario.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      scenario.caller.tier === 'VIP'
                        ? 'bg-amber-500 text-black'
                        : 'bg-blue-700 text-white'
                    }`}>
                      {scenario.caller.tier}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-snug">{scenario.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {scenario.caller.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Patience: {scenario.initialPatience}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => selected && onStart(selected)}
        disabled={!selected}
        className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center gap-2 ${
          selected
            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        <Phone className="w-5 h-5" />
        Answer the Call
        <ChevronRight className="w-5 h-5" />
      </button>

      {!selected && (
        <p className="mt-3 text-sm text-gray-600">Select a scenario above to begin</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Waveform
// ---------------------------------------------------------------------------

function Waveform({ active }) {
  return (
    <div className="flex items-end gap-[2px] h-10 px-1">
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-colors duration-500 ${
            active ? 'waveform-bar bg-cyan-400' : 'bg-gray-700'
          }`}
          style={{
            height: active ? undefined : '4px',
            animationDelay: active ? `${i * 0.04}s` : undefined,
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LeftColumn
// ---------------------------------------------------------------------------

function LeftColumn({ scenario, currentNode, callerPatience, transcript, onChoice, elapsedSeconds }) {
  const transcriptEndRef = useRef(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const caller = scenario.caller

  return (
    <div className="flex flex-col h-full border-r border-gray-800 overflow-hidden">
      {/* Caller info */}
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-white text-base">{caller.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                caller.tier === 'VIP' ? 'bg-amber-500 text-black' : 'bg-blue-700 text-white'
              }`}>
                {caller.tier}
              </span>
            </div>
            <p className="text-sm text-gray-400">{caller.role}</p>
            <p className="text-xs text-gray-500">{caller.department}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-base font-semibold">
              <Clock className="w-4 h-4" />
              {formatTime(elapsedSeconds)}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Asset: {caller.assetTag}</p>
          </div>
        </div>

        {/* Waveform */}
        <div className="mb-3">
          <Waveform active={true} />
        </div>

        {/* Patience bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Caller Patience</span>
            <span className={`font-semibold ${
              callerPatience > 60 ? 'text-green-400' : callerPatience > 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>{callerPatience}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full patience-bar ${patienceColor(callerPatience)}`}
              style={{ width: `${callerPatience}%` }}
            />
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-2">Call Transcript</p>
        {transcript.map((entry) => (
          <div key={entry.id} className="fade-in">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-gray-600 font-mono shrink-0">[{formatTime(entry.timestamp)}]</span>
              <span className={`text-xs font-semibold shrink-0 ${
                entry.speaker === 'caller'  ? 'text-amber-400' :
                entry.speaker === 'tech'    ? 'text-cyan-400' :
                entry.speaker === 'action'  ? 'text-green-400' :
                'text-gray-500'
              }`}>
                {entry.speaker === 'caller' ? caller.name :
                 entry.speaker === 'tech'   ? 'You' :
                 entry.speaker === 'action' ? 'ACTION' : 'SYS'}:
              </span>
            </div>
            <p className={`text-sm pl-0 leading-snug mt-0.5 ${
              entry.speaker === 'caller'  ? 'text-amber-200' :
              entry.speaker === 'tech'    ? 'text-cyan-200' :
              entry.speaker === 'action'  ? 'text-green-300' :
              'text-gray-500 italic'
            }`}>
              {entry.text}
            </p>
            {entry.penaltyNote && (
              <p className="text-xs text-red-400 mt-0.5 pl-0 font-medium">⚠ {entry.penaltyNote}</p>
            )}
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Choice buttons */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50">
        {currentNode?.isResolution ? (
          <div className="text-center py-3 text-gray-400 italic text-sm">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
            Call resolved — complete the ticket form to submit your score.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
              {currentNode?.speaker === 'system' ? 'Required Action' : 'Your Response'}
            </p>
            {currentNode?.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => onChoice(choice)}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-600 text-sm text-gray-200 transition-all duration-150 flex items-start gap-2 group"
              >
                <ChevronRight className="w-4 h-4 text-cyan-600 group-hover:text-cyan-400 shrink-0 mt-0.5" />
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ADHub
// ---------------------------------------------------------------------------

function ADHub({ scenario, adActions, onADAction }) {
  const [search, setSearch] = useState('')

  const users = scenario.adUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.dept.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-600"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {users.map((user) => {
          const actions = adActions[user.id] || {}
          const isDisabled = actions.disabled
          return (
            <div
              key={user.id}
              className={`p-3 rounded-lg border ${isDisabled ? 'border-red-900 bg-red-950/20' : 'border-gray-800 bg-gray-800/50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{user.name}</span>
                    {isDisabled && (
                      <span className="flex items-center gap-1 text-xs bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded border border-red-800">
                        <Lock className="w-3 h-3" /> DISABLED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{user.id}@corp.local — {user.dept}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onADAction(user.id, 'resetPassword')}
                  disabled={actions.passwordReset}
                  className={`flex-1 text-xs py-1.5 px-2 rounded border transition-all ${
                    actions.passwordReset
                      ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                      : 'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20'
                  }`}
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  {actions.passwordReset ? 'Reset Done' : 'Reset Password'}
                </button>
                <button
                  onClick={() => onADAction(user.id, 'disable')}
                  disabled={isDisabled}
                  className={`flex-1 text-xs py-1.5 px-2 rounded border transition-all ${
                    isDisabled
                      ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                      : 'border-red-700 text-red-400 hover:bg-red-900/20'
                  }`}
                >
                  <Lock className="w-3 h-3 inline mr-1" />
                  {isDisabled ? 'Disabled' : 'Disable Account'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// NetworkTerminal
// ---------------------------------------------------------------------------

function NetworkTerminal({ terminalOutput, onCommand, scenarioId }) {
  const terminalEndRef = useRef(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalOutput])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 bg-black overflow-y-auto p-3 font-mono text-sm min-h-0">
        {terminalOutput.length === 0 ? (
          <p className="text-green-700 italic">Microsoft Windows [Version 10.0.22631.3737]<br/>
          (c) Microsoft Corporation. All rights reserved.<br/><br/>
          C:\Users\techsupport&gt; <span className="terminal-cursor">_</span></p>
        ) : (
          <div className="space-y-0">
            {terminalOutput.map((line, i) => (
              <div key={i} className={`leading-5 ${
                line.startsWith('>>>') ? 'text-red-400 font-bold' :
                line.startsWith('>') ? 'text-yellow-300' :
                'text-green-400'
              }`}>
                {line || ' '}
              </div>
            ))}
            <span className="terminal-cursor text-green-400">_</span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
      <div className="p-3 border-t border-gray-800 bg-gray-900 space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Quick Commands</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCommand('ping_printer')}
            className="text-xs px-3 py-1.5 rounded border border-green-800 text-green-400 hover:bg-green-900/20 font-mono transition-all"
          >
            [ Run Ping Test ]
          </button>
          <button
            onClick={() => onCommand('flush_dns')}
            className="text-xs px-3 py-1.5 rounded border border-green-800 text-green-400 hover:bg-green-900/20 font-mono transition-all"
          >
            [ Flush DNS ]
          </button>
          <button
            onClick={() => onCommand('ping_generic')}
            className="text-xs px-3 py-1.5 rounded border border-green-800 text-green-400 hover:bg-green-900/20 font-mono transition-all"
          >
            [ Ping Gateway ]
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MiddleColumn
// ---------------------------------------------------------------------------

function MiddleColumn({ scenario, activeTab, setActiveTab, terminalOutput, onTerminalCommand, adActions, onADAction }) {
  return (
    <div className="flex flex-col h-full border-r border-gray-800 overflow-hidden">
      {/* OS-style header */}
      <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <p className="text-xs text-gray-500 font-mono">CORP-TECH-01 // Sysadmin Workstation</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 bg-gray-900/50">
        <button
          onClick={() => setActiveTab('ad')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'ad'
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-gray-950/40'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Active Directory
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === 'terminal'
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-gray-950/40'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Network Terminal
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'ad' ? (
          <ADHub scenario={scenario} adActions={adActions} onADAction={onADAction} />
        ) : (
          <NetworkTerminal
            terminalOutput={terminalOutput}
            onCommand={onTerminalCommand}
            scenarioId={scenario.id}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RightColumn (Ticket Form)
// ---------------------------------------------------------------------------

function RightColumn({ ticket, setTicket, isResolved, onSubmit, elapsedSeconds }) {
  const CATEGORIES = ['', 'Hardware', 'Software', 'Security', 'Network', 'Account']
  const PRIORITIES = ['', 'Low', 'Medium', 'High', 'Critical']

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-600 transition-colors"
  const labelClass = "block text-xs text-gray-400 uppercase tracking-wider font-medium mb-1"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
        <FileText className="w-4 h-4 text-cyan-400" />
        <p className="text-sm font-medium text-gray-300">ITSM Ticket — New Incident</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className={labelClass}>Ticket ID</label>
          <div className="text-sm font-mono text-gray-500 bg-gray-800/50 border border-gray-800 rounded-lg px-3 py-2">
            INC-{String(Date.now()).slice(-6)}
          </div>
        </div>

        <div>
          <label className={labelClass}>Caller Name</label>
          <input
            type="text"
            value={ticket.callerName}
            onChange={(e) => setTicket((prev) => ({ ...prev, callerName: e.target.value }))}
            placeholder="Full name"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Problem Category</label>
          <select
            value={ticket.category}
            onChange={(e) => setTicket((prev) => ({ ...prev, category: e.target.value }))}
            className={inputClass + ' appearance-none'}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c || '— Select Category —'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Priority Level</label>
          <select
            value={ticket.priority}
            onChange={(e) => setTicket((prev) => ({ ...prev, priority: e.target.value }))}
            className={inputClass + ' appearance-none'}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p || '— Select Priority —'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Asset Tag</label>
          <input
            type="text"
            value={ticket.assetTag}
            onChange={(e) => setTicket((prev) => ({ ...prev, assetTag: e.target.value }))}
            placeholder="e.g. PRN-0042"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Resolution Notes</label>
          <textarea
            value={ticket.notes}
            onChange={(e) => setTicket((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Describe the issue, steps taken, and resolution..."
            rows={6}
            className={inputClass + ' resize-none'}
          />
          <p className="text-xs text-gray-600 mt-1">Tip: Include diagnostic steps, tools used, and final resolution.</p>
        </div>

        <div className="pt-2">
          {!isResolved && (
            <div className="flex items-center gap-2 text-xs text-yellow-500 mb-3 bg-yellow-900/10 border border-yellow-900/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Ticket submission locked until call is resolved.
            </div>
          )}
          <button
            onClick={onSubmit}
            disabled={!isResolved}
            className={`w-full py-3 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 ${
              isResolved
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            <FileText className="w-5 h-5" />
            Submit Ticket
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600 font-mono">Handle Time: {formatTime(elapsedSeconds)}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CallDroppedScreen
// ---------------------------------------------------------------------------

function CallDroppedScreen({ scenario, elapsedSeconds, onReset }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-950/60 rounded-full border border-red-800">
            <PhoneOff className="w-12 h-12 text-red-400" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-red-400 mb-2">Call Dropped</h2>
        <p className="text-gray-400 text-lg mb-6">
          {scenario.caller.name} hung up out of frustration. Patience reached zero.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 space-y-3 text-left">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Caller</span>
            <span className="text-white font-medium">{scenario.caller.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Department</span>
            <span className="text-white font-medium">{scenario.caller.department}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Handle Time</span>
            <span className="text-white font-mono font-medium">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Final Patience</span>
            <span className="text-red-400 font-bold">0%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Outcome</span>
            <span className="text-red-400 font-semibold flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Failed — Call Abandoned
            </span>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Try Another Call
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScorecardScreen
// ---------------------------------------------------------------------------

function ScorecardScreen({ scenario, ticket, callerPatience, elapsedSeconds, transcript, onReset }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])

  const score = calculateScore(scenario, ticket, callerPatience, elapsedSeconds)
  const ideal = scenario.idealTicket

  const bars = [
    { label: 'Interpersonal Skills', sub: 'Caller Patience', pts: score.patience_pts, max: 40, color: 'bg-cyan-500' },
    { label: 'Diagnostic Efficiency', sub: 'Handle Time', pts: score.time_pts, max: 30, color: 'bg-purple-500' },
    { label: 'Ticket Accuracy', sub: 'Category + Priority + Notes', pts: score.ticket_pts, max: 30, color: 'bg-amber-500' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Grade */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Star className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Performance Review</h2>
            <Star className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-gray-500">{scenario.title} — {scenario.caller.name}</p>
          <div className={`text-8xl font-black mt-4 mb-2 ${gradeColor(score.grade)}`}>
            {score.grade}
          </div>
          <p className="text-2xl font-bold text-white">{score.total} / 100</p>
          <p className="text-gray-400 mt-1 text-sm">Handle Time: {formatTime(elapsedSeconds)}</p>
        </div>

        {/* Score bars */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4 space-y-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Performance Breakdown</h3>
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex justify-between items-baseline mb-1.5">
                <div>
                  <span className="text-sm font-medium text-white">{bar.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{bar.sub}</span>
                </div>
                <span className="text-sm font-bold text-white">{bar.pts} / {bar.max}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className={`h-3 rounded-full score-bar ${bar.color}`}
                  style={{ width: animated ? `${(bar.pts / bar.max) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Ticket comparison */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Ticket Accuracy Review</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <div>
                <p className="text-sm text-gray-400">Problem Category</p>
                <p className="text-xs text-gray-600">Ideal: <span className="text-gray-400">{ideal.category}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{ticket.category || '(none)'}</span>
                {ticket.category === ideal.category
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />
                }
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <div>
                <p className="text-sm text-gray-400">Priority Level</p>
                <p className="text-xs text-gray-600">Ideal: <span className="text-gray-400">{ideal.priority}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{ticket.priority || '(none)'}</span>
                {ticket.priority === ideal.priority
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />
                }
              </div>
            </div>
            <div className="pt-1">
              <p className="text-sm text-gray-400 mb-2">Resolution Note Keywords</p>
              <div className="flex flex-wrap gap-2">
                {ideal.noteKeywords.map((kw) => {
                  const found = (ticket.notes || '').toLowerCase().includes(kw.toLowerCase())
                  return (
                    <span
                      key={kw}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                        found
                          ? 'border-green-700 bg-green-900/20 text-green-400'
                          : 'border-red-900 bg-red-950/20 text-red-400'
                      }`}
                    >
                      {found ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {kw}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Call quality summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Call Quality Summary</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Final Patience</span>
              <span className={callerPatience > 60 ? 'text-green-400' : callerPatience > 30 ? 'text-yellow-400' : 'text-red-400'}>
                {callerPatience}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Dialogue exchanges</span>
              <span className="text-white">{transcript.filter(t => t.speaker === 'tech').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Penalty events</span>
              <span className="text-red-400">{transcript.filter(t => t.penaltyNote).length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tools used</span>
              <span className="text-white">{transcript.filter(t => t.speaker === 'action').length}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
        >
          <RotateCcw className="w-5 h-5" />
          Reset and Try Another Call
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ActiveCallScreen — top bar only, delegates to columns
// ---------------------------------------------------------------------------

function ActiveCallScreen({
  scenario, currentNode, callerPatience, transcript, elapsedSeconds,
  ticket, setTicket, isResolved, activeTab, setActiveTab,
  terminalOutput, adActions,
  onChoice, onADAction, onTerminalCommand, onSubmit,
}) {
  const [mobileCol, setMobileCol] = useState('left')

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-semibold uppercase tracking-wide">LIVE CALL</span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-sm text-gray-300 font-medium">{scenario.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span className="font-mono">CORP-NET</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-sm font-semibold">
            <Clock className="w-4 h-4" />
            {formatTime(elapsedSeconds)}
          </div>
        </div>
      </header>

      {/* Mobile column switcher */}
      <div className="flex lg:hidden border-b border-gray-800 bg-gray-900 shrink-0">
        {[['left', 'Call'], ['middle', 'Desktop'], ['right', 'Ticket']].map(([col, label]) => (
          <button
            key={col}
            onClick={() => setMobileCol(col)}
            className={`flex-1 py-2 text-sm font-medium transition-all ${
              mobileCol === col ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 3-column grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3">
        <div className={`min-h-0 h-full overflow-hidden ${mobileCol === 'left' ? 'block' : 'hidden'} lg:block`}>
          <LeftColumn
            scenario={scenario}
            currentNode={currentNode}
            callerPatience={callerPatience}
            transcript={transcript}
            onChoice={onChoice}
            elapsedSeconds={elapsedSeconds}
          />
        </div>
        <div className={`min-h-0 h-full overflow-hidden ${mobileCol === 'middle' ? 'block' : 'hidden'} lg:block`}>
          <MiddleColumn
            scenario={scenario}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            terminalOutput={terminalOutput}
            onTerminalCommand={onTerminalCommand}
            adActions={adActions}
            onADAction={onADAction}
          />
        </div>
        <div className={`min-h-0 h-full overflow-hidden ${mobileCol === 'right' ? 'block' : 'hidden'} lg:block`}>
          <RightColumn
            ticket={ticket}
            setTicket={setTicket}
            isResolved={isResolved}
            onSubmit={onSubmit}
            elapsedSeconds={elapsedSeconds}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App — Root state machine
// ---------------------------------------------------------------------------

export default function App() {
  const [gameStatus, setGameStatus]               = useState('start')
  const [currentScenarioId, setCurrentScenarioId] = useState(null)
  const [currentNodeId, setCurrentNodeId]         = useState('start')
  const [callerPatience, setCallerPatience]       = useState(100)
  const [elapsedSeconds, setElapsedSeconds]       = useState(0)
  const [transcript, setTranscript]               = useState([])
  const [ticket, setTicket]                       = useState({ callerName: '', category: '', priority: '', assetTag: '', notes: '' })
  const [isResolved, setIsResolved]               = useState(false)
  const [activeTab, setActiveTab]                 = useState('ad')
  const [terminalOutput, setTerminalOutput]       = useState([])
  const [adActions, setAdActions]                 = useState({})

  const timerRef         = useRef(null)
  const patienceTimerRef = useRef(null)
  const isResolvedRef    = useRef(false)
  const elapsedRef       = useRef(0)

  // Keep refs in sync
  useEffect(() => { isResolvedRef.current = isResolved }, [isResolved])
  useEffect(() => { elapsedRef.current = elapsedSeconds }, [elapsedSeconds])

  // Upward-counting timer
  useEffect(() => {
    if (gameStatus === 'active') {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [gameStatus])

  // Passive patience drain
  useEffect(() => {
    if (gameStatus === 'active') {
      patienceTimerRef.current = setInterval(() => {
        setCallerPatience((p) => {
          const next = p - 1
          if (next <= 0 && !isResolvedRef.current) {
            setGameStatus('dropped')
            clearInterval(patienceTimerRef.current)
            return 0
          }
          return Math.max(0, next)
        })
      }, 8000)
    }
    return () => clearInterval(patienceTimerRef.current)
  }, [gameStatus])

  // Resolution detection
  const scenario = currentScenarioId ? SCENARIOS[currentScenarioId] : null
  useEffect(() => {
    if (!scenario) return
    const node = scenario.nodes[currentNodeId]
    if (node?.isResolution) {
      setIsResolved(true)
      isResolvedRef.current = true
      clearInterval(patienceTimerRef.current)
      setTranscript((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          timestamp: elapsedRef.current,
          speaker: 'system',
          text: 'Call resolved. Complete the ticket form and submit your score.',
          tag: 'system',
        },
      ])
    }
  }, [currentNodeId, scenario])

  const startGame = useCallback((scenarioId) => {
    const sc = SCENARIOS[scenarioId]
    setCurrentScenarioId(scenarioId)
    setCurrentNodeId('start')
    setCallerPatience(sc.initialPatience)
    setElapsedSeconds(0)
    setIsResolved(false)
    isResolvedRef.current = false
    setActiveTab('ad')
    setTerminalOutput([])
    setAdActions({})
    setTicket({ callerName: sc.caller.name, category: '', priority: '', assetTag: sc.caller.assetTag, notes: '' })
    setTranscript([
      {
        id: Date.now(),
        timestamp: 0,
        speaker: 'system',
        text: `Incoming call from ${sc.caller.name} — ${sc.caller.role}, ${sc.caller.department}`,
        tag: 'system',
      },
      {
        id: Date.now() + 1,
        timestamp: 0,
        speaker: 'caller',
        text: sc.nodes.start.text,
        tag: 'caller',
      },
    ])
    setGameStatus('active')
  }, [])

  const handleChoice = useCallback((choice) => {
    const now = elapsedRef.current

    // Apply patience effect
    setCallerPatience((p) => {
      const next = Math.max(0, Math.min(100, p + choice.patienceEffect))
      if (next <= 0 && !isResolvedRef.current) {
        setGameStatus('dropped')
      }
      return next
    })

    // Log tech response
    setTranscript((prev) => {
      const entries = [
        ...prev,
        {
          id: Date.now(),
          timestamp: now,
          speaker: 'tech',
          text: choice.label,
          tag: choice.transcriptTag,
          penaltyNote: choice.penaltyNote || null,
        },
      ]

      // Add caller response if next node has caller dialogue
      const sc = SCENARIOS[currentScenarioId]
      if (sc) {
        const nextNode = sc.nodes[choice.nextNode]
        if (nextNode && nextNode.speaker === 'caller') {
          entries.push({
            id: Date.now() + 2,
            timestamp: now,
            speaker: 'caller',
            text: nextNode.text,
            tag: 'caller',
          })
        } else if (nextNode && nextNode.speaker === 'system') {
          entries.push({
            id: Date.now() + 2,
            timestamp: now,
            speaker: 'system',
            text: nextNode.text,
            tag: 'system',
          })
        }
      }
      return entries
    })

    // Handle side effects
    if (choice.requiresTerminalAction) {
      setActiveTab('terminal')
      runTerminalCommand(choice.requiresTerminalAction)
    }
    if (choice.requiresADAction) {
      setActiveTab('ad')
    }

    setCurrentNodeId(choice.nextNode)
  }, [currentScenarioId])

  const runTerminalCommand = useCallback((commandType) => {
    const lines = TERMINAL_OUTPUTS[commandType] || []
    setTerminalOutput((prev) => [...prev, ``, `--- Running: ${commandType} ---`])
    let i = 0
    const id = setInterval(() => {
      if (i >= lines.length) { clearInterval(id); return }
      setTerminalOutput((prev) => [...prev, lines[i]])
      i++
    }, 120)
    setActiveTab('terminal')
  }, [])

  const handleADAction = useCallback((userId, action) => {
    setAdActions((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [action]: true },
    }))

    const sc = SCENARIOS[currentScenarioId]
    const user = sc?.adUsers.find((u) => u.id === userId)
    const actionLabel = action === 'disable' ? 'Disabled account' : 'Reset password'

    setTranscript((prev) => [
      ...prev,
      {
        id: Date.now(),
        timestamp: elapsedRef.current,
        speaker: 'action',
        text: `AD: ${actionLabel} for ${user?.name || userId}`,
        tag: 'action',
      },
    ])

    // Scenario 2: disabling schen gives a patience bonus
    if (action === 'disable' && userId === 'schen') {
      setCallerPatience((p) => Math.min(100, p + 5))
    }
  }, [currentScenarioId])

  const handleSubmitTicket = useCallback(() => {
    if (!isResolved) return
    clearInterval(timerRef.current)
    clearInterval(patienceTimerRef.current)
    setGameStatus('scorecard')
  }, [isResolved])

  const resetGame = useCallback(() => {
    clearInterval(timerRef.current)
    clearInterval(patienceTimerRef.current)
    setGameStatus('start')
    setCurrentScenarioId(null)
    setCurrentNodeId('start')
    setCallerPatience(100)
    setElapsedSeconds(0)
    setTranscript([])
    setTicket({ callerName: '', category: '', priority: '', assetTag: '', notes: '' })
    setIsResolved(false)
    isResolvedRef.current = false
    setActiveTab('ad')
    setTerminalOutput([])
    setAdActions({})
  }, [])

  const currentNode = scenario ? scenario.nodes[currentNodeId] : null

  if (gameStatus === 'start') {
    return <StartScreen onStart={startGame} />
  }

  if (gameStatus === 'active' && scenario) {
    return (
      <ActiveCallScreen
        scenario={scenario}
        currentNode={currentNode}
        callerPatience={callerPatience}
        transcript={transcript}
        elapsedSeconds={elapsedSeconds}
        ticket={ticket}
        setTicket={setTicket}
        isResolved={isResolved}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        terminalOutput={terminalOutput}
        adActions={adActions}
        onChoice={handleChoice}
        onADAction={handleADAction}
        onTerminalCommand={runTerminalCommand}
        onSubmit={handleSubmitTicket}
      />
    )
  }

  if (gameStatus === 'dropped' && scenario) {
    return (
      <CallDroppedScreen
        scenario={scenario}
        elapsedSeconds={elapsedSeconds}
        onReset={resetGame}
      />
    )
  }

  if (gameStatus === 'scorecard' && scenario) {
    return (
      <ScorecardScreen
        scenario={scenario}
        ticket={ticket}
        callerPatience={callerPatience}
        elapsedSeconds={elapsedSeconds}
        transcript={transcript}
        onReset={resetGame}
      />
    )
  }

  return null
}
