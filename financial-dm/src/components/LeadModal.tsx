import { useState } from "react";

interface LeadModalProps {
  isOpen: boolean;
  onSubmit: (name: string, email: string, phone: string) => void;
  onClose: () => void;
}

export default function LeadModal({ isOpen, onSubmit, onClose }: LeadModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Thy name is required!";
    if (!email.trim()) e.email = "We need thy email!";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "That looks like a cursed email...";
    if (!phone.trim()) e.phone = "Thy phone number, please!";
    else if (!/^[\d\s\-\+\(\)]{7,}$/.test(phone)) e.phone = "A valid phone number, adventurer!";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) {
      onSubmit(name.trim(), email.trim(), phone.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 14, 22, 0.85)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border-2 border-[#406080]/50 shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0d1520 0%, #111a28 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 text-center border-b border-[#406080]/40"
          style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}
        >
          <h3 className="text-lg font-fantasy text-[#c08020]">Summon Thy DM</h3>
          <p className="text-xs text-[#a0a0a0] mt-1">
            Enter thy details to book a council with John
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm font-fantasy text-[#a0a0a0] mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Thy name, adventurer"
              className="w-full px-3 py-2.5 rounded-lg bg-[#204060]/20 border border-[#406080]/50 text-[#e0e0e0] placeholder:text-[#406080] focus:outline-none focus:border-[#c08020] focus:ring-1 focus:ring-[#c08020]/30 transition-all text-sm"
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1 font-fantasy">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-fantasy text-[#a0a0a0] mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="thy@email.com"
              className="w-full px-3 py-2.5 rounded-lg bg-[#204060]/20 border border-[#406080]/50 text-[#e0e0e0] placeholder:text-[#406080] focus:outline-none focus:border-[#c08020] focus:ring-1 focus:ring-[#c08020]/30 transition-all text-sm"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1 font-fantasy">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-fantasy text-[#a0a0a0] mb-1">
              Phone *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123 4567"
              className="w-full px-3 py-2.5 rounded-lg bg-[#204060]/20 border border-[#406080]/50 text-[#e0e0e0] placeholder:text-[#406080] focus:outline-none focus:border-[#c08020] focus:ring-1 focus:ring-[#c08020]/30 transition-all text-sm"
            />
            {errors.phone && (
              <p className="text-red-400 text-xs mt-1 font-fantasy">{errors.phone}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#406080]/50 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#406080]/60 transition-all font-fantasy text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold shadow-lg shadow-[#c08020]/20 transition-all font-fantasy text-sm"
            >
              Roll for Initiative!
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
