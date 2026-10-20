"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Star,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building2,
  X,
  MessageSquare,
} from "lucide-react";

interface VendorPackage {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface VendorReview {
  id: string;
  eventName: string;
  rating: number;
  feedback: string;
  authorName: string;
  createdAt: string;
}

interface VendorItem {
  id: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  description: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  packages: VendorPackage[];
  reviews: VendorReview[];
  status: string;
}

interface BookingItem {
  id: string;
  vendor: { id: string; name: string; category: string; phone: string; email: string };
  event: { id: string; name: string; startDate: string; venue: string };
  service: string;
  startDate: string;
  endDate: string;
  agreedAmount: number;
  status: "tentative" | "confirmed" | "cancelled";
  hasConflict: boolean;
  conflictDetails?: string;
  conflictOverrideReason?: string;
  conflictOverriddenBy?: string;
  notes?: string;
}

interface VendorsViewProps {
  events: { id: string; name: string; startDate: string; venue: string }[];
  notify: (text: string, type?: "success" | "error") => void;
  canManage: boolean;
}

const CATEGORIES = [
  "All",
  "Catering",
  "Venue",
  "Photography",
  "Florals",
  "Sound & Lighting",
  "Entertainment",
  "Transport",
  "Security",
  "Decor",
  "Rentals",
];

export default function VendorsView({ events, notify, canManage }: VendorsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "bookings">("directory");
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modals
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedVendorForReview, setSelectedVendorForReview] = useState<VendorItem | null>(null);

  // New Vendor Form
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorCategory, setNewVendorCategory] = useState("Catering");
  const [newVendorContact, setNewVendorContact] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorAddress, setNewVendorAddress] = useState("");
  const [newVendorDesc, setNewVendorDesc] = useState("");
  const [newVendorVerified, setNewVendorVerified] = useState(true);

  // New Booking Form
  const [bookingVendorId, setBookingVendorId] = useState("");
  const [bookingEventId, setBookingEventId] = useState("");
  const [bookingService, setBookingService] = useState("");
  const [bookingStartDate, setBookingStartDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [bookingAmount, setBookingAmount] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"tentative" | "confirmed">("confirmed");

  // Conflict state (FR-22 & BR-7)
  const [conflictDetected, setConflictDetected] = useState<{
    message: string;
    conflictingBookings: any[];
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  // Review Form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewEventName, setReviewEventName] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [vRes, bRes] = await Promise.all([
        fetch(`/api/vendors?category=${encodeURIComponent(selectedCategory)}&search=${encodeURIComponent(searchQuery)}`),
        fetch("/api/vendors/bookings"),
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        setVendors(vData.vendors || []);
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBookings(bData.bookings || []);
      }
    } catch (err) {
      console.error("Failed to load vendor data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery]);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVendorName,
          category: newVendorCategory,
          contactName: newVendorContact,
          email: newVendorEmail,
          phone: newVendorPhone,
          address: newVendorAddress,
          description: newVendorDesc,
          isVerified: newVendorVerified,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Vendor "${data.vendor.name}" created successfully!`);
      setShowAddVendorModal(false);
      setNewVendorName("");
      setNewVendorContact("");
      setNewVendorEmail("");
      setNewVendorPhone("");
      setNewVendorAddress("");
      setNewVendorDesc("");
      loadData();
    } catch (err: any) {
      notify(err.message || "Failed to create vendor", "error");
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        vendorId: bookingVendorId,
        eventId: bookingEventId,
        service: bookingService,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
        agreedAmount: Number(bookingAmount),
        status: bookingStatus,
      };

      if (overrideReason) {
        payload.overrideReason = overrideReason;
      }

      const res = await fetch("/api/vendors/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.conflict) {
        // Double-booking conflict detected (FR-22)
        setConflictDetected({
          message: data.message,
          conflictingBookings: data.conflictingBookings || [],
        });
        notify(data.message, "error");
        return;
      }

      if (!res.ok) throw new Error(data.message || data.error);

      notify(
        data.booking.hasConflict
          ? `Booking confirmed with audited override for "${data.booking.vendorName}"!`
          : `Booking confirmed for "${data.booking.vendorName}"!`
      );

      setShowBookingModal(false);
      setConflictDetected(null);
      setOverrideReason("");
      setBookingVendorId("");
      setBookingService("");
      setBookingAmount("");
      loadData();
    } catch (err: any) {
      notify(err.message || "Failed to create booking", "error");
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForReview) return;
    try {
      const res = await fetch(`/api/vendors/${selectedVendorForReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newReview: {
            rating: reviewRating,
            feedback: reviewFeedback,
            eventName: reviewEventName,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Review added for "${selectedVendorForReview.name}"!`);
      setShowReviewModal(false);
      setReviewFeedback("");
      setReviewEventName("");
      loadData();
    } catch (err: any) {
      notify(err.message || "Failed to add review", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Vendor CRM & Coordination</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53]">
              Vendor Management
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Private organization supplier directory, price packages, internal ratings, and double-booking conflict detection.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Sub-tab Switcher */}
          <div className="flex bg-stone-200/70 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab("directory")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === "directory" ? "bg-white text-slate-900 shadow-xs" : "text-stone-600 hover:text-slate-900"
              }`}
            >
              Directory ({vendors.length})
            </button>
            <button
              onClick={() => setActiveSubTab("bookings")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                activeSubTab === "bookings" ? "bg-white text-slate-900 shadow-xs" : "text-stone-600 hover:text-slate-900"
              }`}
            >
              <span>Bookings ({bookings.length})</span>
              {bookings.some((b) => b.hasConflict) && (
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Conflicts recorded" />
              )}
            </button>
          </div>

          {canManage && (
            <>
              <button
                onClick={() => {
                  setConflictDetected(null);
                  setOverrideReason("");
                  setShowBookingModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[#E06B53]" />
                <span>Book Vendor</span>
              </button>
              <button
                onClick={() => setShowAddVendorModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Vendor</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* DIRECTORY VIEW */}
      {activeSubTab === "directory" && (
        <div className="space-y-4">
          {/* Search & Category Pills */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search vendors by company, contact, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs text-slate-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Vendors Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400">Loading vendor records...</div>
          ) : vendors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/80 space-y-2">
              <Briefcase className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No vendors found</p>
              <p className="text-xs text-stone-400">Add suppliers to your workspace to coordinate bookings and contracts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((v) => (
                <div
                  key={v.id}
                  className="p-5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-300 hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{v.name}</h3>
                          {v.isVerified && (
                            <span title="Internally Verified">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[#E06B53] uppercase tracking-wider block mt-0.5">
                          {v.category}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-amber-800">{v.rating}</span>
                        <span className="text-[10px] text-amber-600">({v.reviewsCount})</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">{v.description}</p>

                    {/* Contact & Location details */}
                    <div className="mt-3.5 space-y-1.5 text-xs text-stone-500 border-t border-stone-100 pt-3">
                      <div className="flex items-center space-x-2 truncate">
                        <Briefcase className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{v.contactName}</span>
                      </div>
                      <div className="flex items-center space-x-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{v.email}</span>
                      </div>
                      {v.phone && (
                        <div className="flex items-center space-x-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{v.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Packages count */}
                    {v.packages.length > 0 && (
                      <div className="mt-3 bg-stone-50 p-2 rounded-xl text-[11px] text-stone-600">
                        <span className="font-semibold text-slate-800">{v.packages.length} Packages</span>:{" "}
                        <span className="text-stone-500">{v.packages.map((p) => p.name).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedVendorForReview(v);
                        setShowReviewModal(true);
                      }}
                      className="text-xs text-stone-600 hover:text-slate-900 font-medium flex items-center space-x-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                      <span>Rate & Feedback</span>
                    </button>

                    {canManage && (
                      <button
                        onClick={() => {
                          setBookingVendorId(v.id);
                          setConflictDetected(null);
                          setShowBookingModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#E06B53] hover:text-white text-slate-800 text-xs font-semibold transition"
                      >
                        Book
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOOKINGS VIEW (WITH CONFLICT AUDITING FR-22, BR-7) */}
      {activeSubTab === "bookings" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200/80 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Vendor & Service</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Schedule Time Range</th>
                  <th className="py-3 px-4">Agreed Amount</th>
                  <th className="py-3 px-4">Status & Conflicts</th>
                  <th className="py-3 px-4">Override Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-slate-700">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No vendor bookings recorded.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-stone-50/50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{b.vendor?.name || "Vendor"}</div>
                        <div className="text-[11px] font-normal text-stone-500">{b.service}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {b.event?.name || "Event Workspace"}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        <div>{new Date(b.startDate).toLocaleDateString()}</div>
                        <div className="text-[10px] text-stone-400">
                          {new Date(b.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {new Date(b.endDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ${b.agreedAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {b.status}
                          </span>
                          {b.hasConflict && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Overlap</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-600 max-w-xs">
                        {b.hasConflict ? (
                          <div>
                            <div className="font-semibold text-rose-900 text-[11px]">{b.conflictDetails}</div>
                            <div className="text-[10px] text-stone-500 italic mt-0.5">
                              "{b.conflictOverrideReason}" — {b.conflictOverriddenBy}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400">— Clean schedule</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD VENDOR */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Add Supplier to Vendor CRM</h3>
              <button onClick={() => setShowAddVendorModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Vendor / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Cru Catering & Sommelier"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#E06B53]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Category *
                  </label>
                  <select
                    value={newVendorCategory}
                    onChange={(e) => setNewVendorCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chef Antoine Laurent"
                    value={newVendorContact}
                    onChange={(e) => setNewVendorContact(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@company.com"
                    value={newVendorEmail}
                    onChange={(e) => setNewVendorEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newVendorPhone}
                    onChange={(e) => setNewVendorPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Business Address / Base
                </label>
                <input
                  type="text"
                  placeholder="e.g. 142 West 26th St, New York, NY"
                  value={newVendorAddress}
                  onChange={(e) => setNewVendorAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Service Descriptions & Specializations
                </label>
                <textarea
                  rows={3}
                  placeholder="Bespoke services, Michelin credentials, dietary capabilities..."
                  value={newVendorDesc}
                  onChange={(e) => setNewVendorDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  id="verified"
                  checked={newVendorVerified}
                  onChange={(e) => setNewVendorVerified(e.target.checked)}
                  className="rounded text-[#E06B53] focus:ring-[#E06B53]"
                />
                <label htmlFor="verified" className="text-xs text-slate-700 cursor-pointer">
                  Mark as <strong>Internally Verified</strong> (licenses, COI insurance certificates on file)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BOOK VENDOR (WITH CONFLICT WARNING & AUDITED OVERRIDE) */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">Assign Vendor to Event</h3>
                <span className="text-[10px] text-stone-500">Quotations & Schedule Conflict Check</span>
              </div>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setConflictDetected(null);
                }}
                className="text-stone-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Select Vendor *
                </label>
                <select
                  required
                  value={bookingVendorId}
                  onChange={(e) => setBookingVendorId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none bg-white"
                >
                  <option value="">-- Choose a vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Assign to Event *
                </label>
                <select
                  required
                  value={bookingEventId}
                  onChange={(e) => setBookingEventId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none bg-white"
                >
                  <option value="">-- Choose an event --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({new Date(ev.startDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Service Scope / Package *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Line array audio, wireless mics & pinspot table lighting"
                  value={bookingService}
                  onChange={(e) => setBookingService(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingStartDate}
                    onChange={(e) => setBookingStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingEndDate}
                    onChange={(e) => setBookingEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Agreed Contract Amount ($) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="18500"
                    value={bookingAmount}
                    onChange={(e) => setBookingAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Initial Booking Status
                  </label>
                  <select
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    <option value="tentative">Tentative Quote</option>
                    <option value="confirmed">Confirmed Contract</option>
                  </select>
                </div>
              </div>

              {/* CONFLICT PROMPT (FR-22 & BR-7) */}
              {conflictDetected && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center space-x-2 text-rose-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Double-Booking Conflict Detected!</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    {conflictDetected.message}
                  </p>
                  <div>
                    <label className="font-bold text-rose-950 uppercase tracking-wider text-[10px] block mb-1">
                      Override Justification Reason * (Mandatory for Compliance Audit Trail)
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Vendor is dispatching independent Crew B with separate equipment..."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setConflictDetected(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-semibold transition ${
                    conflictDetected ? "bg-rose-600 hover:bg-rose-700" : "bg-[#E06B53] hover:bg-[#c95841]"
                  }`}
                >
                  {conflictDetected ? "Confirm With Audited Override" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RATE & FEEDBACK (FR-23) */}
      {showReviewModal && selectedVendorForReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Internal Rating: {selectedVendorForReview.name}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Event Association
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aura Foundation Gala"
                  value={reviewEventName}
                  onChange={(e) => setReviewEventName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Performance Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-500 transition hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${star <= reviewRating ? "fill-amber-500" : "text-stone-300"}`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-slate-900 ml-2">{reviewRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Feedback & Delivery Review
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Reliability, punctuality, food quality, responsiveness..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841]"
                >
                  Save Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
