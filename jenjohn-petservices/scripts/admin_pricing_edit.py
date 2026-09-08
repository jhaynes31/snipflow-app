import io, re, sys

path = "/home/team/shared/site/src/routes/admin.tsx"
src = io.open(path, encoding="utf-8").read()
orig = src

def rep(old, new, count=1):
    global src
    assert old in src, "NOT FOUND: " + old[:120]
    src = src.replace(old, new, count)

# 1) RequestRecord interface: add holiday surcharge fields
rep(
    "  pets: unknown;\n  isHoliday: boolean;\n  totalPrice: number;\n  priceBreakdown?: BreakdownItem[];",
    "  pets: unknown;\n  isHoliday: boolean;\n  totalPrice: number;\n  holidaySurchargeDays?: number;\n  holidaySurcharge?: number;\n  priceBreakdown?: BreakdownItem[];",
)

# 2) BookingRecord interface: add optional holiday surcharge (joined from request)
rep(
    "  petNames?: string;\n  depositAmount?: number;\n  isHoliday?: boolean;\n  arrivalTime?: string;",
    "  petNames?: string;\n  depositAmount?: number;\n  isHoliday?: boolean;\n  holidaySurchargeDays?: number;\n  holidaySurcharge?: number;\n  arrivalTime?: string;",
)

# 3) adminUpdateRequestStatus validator: add holiday fields
rep(
    "      isHoliday?: boolean;\n      totalPrice?: number;\n      priceBreakdown?: unknown;",
    "      isHoliday?: boolean;\n      totalPrice?: number;\n      holidaySurchargeDays?: number;\n      holidaySurcharge?: number;\n      priceBreakdown?: unknown;",
)

# 4) adminUpdateRequestStatus handler: forward total + holiday overrides to the mutation
rep(
    "      const statusResult: any = await convexMutation(\"updateRequestStatus\", {\n        id: data.id,\n        status: data.status,\n        depositAmount: data.depositAmount,\n        depositLink: data.depositLink,\n      });",
    "      const statusResult: any = await convexMutation(\"updateRequestStatus\", {\n        id: data.id,\n        status: data.status,\n        depositAmount: data.depositAmount,\n        depositLink: data.depositLink,\n        totalPrice: data.totalPrice,\n        isHoliday: data.isHoliday,\n        holidaySurchargeDays: data.holidaySurchargeDays,\n        holidaySurcharge: data.holidaySurcharge,\n      });",
)

# 5) RequestCard onApprove prop signature
rep(
    "  onApprove: (req: RequestRecord) => void;",
    "  onApprove: (req: RequestRecord, total: number, deposit: number) => void;",
)

# 6) RequestCard: add editable total/deposit state right after depositAmount/submittedAt calc
rep(
    "  const depositAmount =\n    req.depositAmount ?? Math.round((req.totalPrice || 0) * 0.5);\n  const submittedAt = new Date(req.createdAt).toLocaleDateString(\"en-US\", {",
    "  const [editTotal, setEditTotal] = useState(req.totalPrice || 0);\n  const [editDeposit, setEditDeposit] = useState(\n    req.depositAmount ?? Math.round((req.totalPrice || 0) * 0.5),\n  );\n  const [depositTouched, setDepositTouched] = useState(false);\n  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const v = Number(e.target.value);\n    const total = Number.isFinite(v) && v >= 0 ? v : 0;\n    setEditTotal(total);\n    if (!depositTouched) setEditDeposit(Math.round(total * 0.5));\n  };\n  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n    setDepositTouched(true);\n    const v = Number(e.target.value);\n    setEditDeposit(Number.isFinite(v) && v >= 0 ? v : 0);\n  };\n  const depositAmount =\n    req.depositAmount ?? Math.round((req.totalPrice || 0) * 0.5);\n  const submittedAt = new Date(req.createdAt).toLocaleDateString(\"en-US\", {",
)

# 7) RequestCard Price section: editable total/deposit for pending
rep(
    "      {/* Price */}\n      <DetailSection title=\"Price\">\n        <DetailRow label=\"Total\" value={formatPrice(req.totalPrice)} />\n        <DetailRow label=\"Holiday rate\" value={req.isHoliday ? \"Yes\" : \"No\"} />",
    "      {/* Price */}\n      <DetailSection title=\"Price\">\n        {req.status === \"pending\" ? (\n          <div className=\"space-y-2\">\n            <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-2\">\n              <label className=\"block\">\n                <span className=\"font-sans text-xs font-semibold text-brand-brown-light\">\n                  Total price ($)\n                </span>\n                <input\n                  type=\"number\"\n                  min={0}\n                  step=\"0.01\"\n                  value={editTotal}\n                  onChange={handleTotalChange}\n                  disabled={actionLoading}\n                  className=\"mt-1 w-full border border-brand-tan/30 rounded-md px-2 py-1 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-tan/40\"\n                />\n              </label>\n              <label className=\"block\">\n                <span className=\"font-sans text-xs font-semibold text-brand-brown-light\">\n                  Deposit ($)\n                </span>\n                <input\n                  type=\"number\"\n                  min={0}\n                  step=\"0.01\"\n                  value={editDeposit}\n                  onChange={handleDepositChange}\n                  disabled={actionLoading}\n                  className=\"mt-1 w-full border border-brand-tan/30 rounded-md px-2 py-1 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-tan/40\"\n                />\n              </label>\n            </div>\n            <p className=\"font-sans text-xs text-brand-brown-light\">\n              Review the total and deposit before approving. The booking, the\n              client emails and the remaining balance all use these values.\n            </p>\n          </div>\n        ) : (\n          <DetailRow label=\"Total\" value={formatPrice(req.totalPrice)} />\n        )}\n        <DetailRow label=\"Holiday rate\" value={req.isHoliday ? \"Yes\" : \"No\"} />",
)

# 8) RequestCard Approve button: pass edited values
rep(
    "            <button\n              onClick={() => onApprove(req)}\n              disabled={actionLoading}\n              className=\"flex-1 bg-green-600 text-white font-sans font-medium text-xs px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50\"\n            >\n              {actionLoading ? \"...\" : \"Approve\"}\n            </button>",
    "            <button\n              onClick={() => onApprove(req, editTotal, editDeposit)}\n              disabled={actionLoading}\n              className=\"flex-1 bg-green-600 text-white font-sans font-medium text-xs px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50\"\n            >\n              {actionLoading ? \"...\" : \"Approve\"}\n            </button>",
)

# 9) handleApprove: accept edited total/deposit and forward total + holiday
rep(
    "  const handleApprove = async (req: RequestRecord) => {\n    setActionLoading(req._id);\n    try {\n      const depositAmount = Math.round(req.totalPrice * 0.5);\n      const result = await adminUpdateRequestStatus({\n        data: {\n          id: req._id,\n          status: \"approved\",\n          depositAmount,\n          depositLink: \"manual\",\n          clientName: req.clientName,\n          clientEmail: req.clientEmail,\n          clientPhone: req.clientPhone,\n          arrivalDate: req.arrivalDate,\n          arrivalTime: req.arrivalTime,\n          departureDate: req.departureDate,\n          departureTime: req.departureTime,\n          pets: req.pets,\n          isHoliday: req.isHoliday,\n          totalPrice: req.totalPrice,\n          priceBreakdown: req.priceBreakdown,\n          notes: req.notes,\n          petNames: req.petNames,\n          petDetails: req.petDetails,\n        },\n      });",
    "  const handleApprove = async (\n    req: RequestRecord,\n    editedTotal?: number,\n    editedDeposit?: number,\n  ) => {\n    setActionLoading(req._id);\n    try {\n      const approvedTotal = editedTotal ?? req.totalPrice;\n      const depositAmount =\n        editedDeposit ?? Math.round(approvedTotal * 0.5);\n      const result = await adminUpdateRequestStatus({\n        data: {\n          id: req._id,\n          status: \"approved\",\n          depositAmount,\n          depositLink: \"manual\",\n          clientName: req.clientName,\n          clientEmail: req.clientEmail,\n          clientPhone: req.clientPhone,\n          arrivalDate: req.arrivalDate,\n          arrivalTime: req.arrivalTime,\n          departureDate: req.departureDate,\n          departureTime: req.departureTime,\n          pets: req.pets,\n          isHoliday: req.isHoliday,\n          totalPrice: approvedTotal,\n          holidaySurchargeDays: req.holidaySurchargeDays,\n          holidaySurcharge: req.holidaySurcharge,\n          priceBreakdown: req.priceBreakdown,\n          notes: req.notes,\n          petNames: req.petNames,\n          petDetails: req.petDetails,\n        },\n      });",
)

io.open(path, "w", encoding="utf-8").write(src)
print("OK all replacements applied")
