import { create } from 'zustand';

type BookingState = {
  serviceId?: string;
  serviceName?: string; // Nombre descriptivo del servicio.
  professionalId?: string | null;
  professionalName?: string | null;
  date?: string; // YYYY-MM-DD
  slotStart?: string; // ISO string
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  notes?: string | null;
  setService: (serviceId: string, serviceName?: string) => void;
  setProfessional: (proId: string | null, proName?: string | null) => void;
  setDate: (date: string) => void;
  setSlot: (isoStart: string) => void;
  setCustomerName: (name: string) => void;
  setCustomerEmail: (email: string | null) => void;
  setCustomerPhone: (phone: string) => void;
  setNotes: (notes: string | null) => void;
  reset: () => void;
};

export const useBooking = create<BookingState>((set) => ({
  serviceId: undefined,
  serviceName: undefined,
  professionalId: null,
  professionalName: null,
  date: undefined,
  slotStart: undefined,
  customerName: "",
  customerEmail: null,
  customerPhone: "",
  notes: null,
  setService: (serviceId, serviceName) =>
    set((state) => ({
      serviceId,
      serviceName: serviceName ?? state.serviceName,
      professionalId: null,
      professionalName: null,
      date: undefined,
      slotStart: undefined,
    })),
  setProfessional: (professionalId, professionalName = null) =>
    set({ professionalId, professionalName, slotStart: undefined }),
  setDate: (date) => set({ date, slotStart: undefined }),
  setSlot: (isoStart) => set({ slotStart: isoStart }),
  setCustomerName: (name) => set({ customerName: name }),
  setCustomerEmail: (email) => set({ customerEmail: email }),
  setCustomerPhone: (phone) => set({ customerPhone: phone }),
  setNotes: (notes) => set({ notes }),
  reset: () =>
    set({
      serviceId: undefined,
      serviceName: undefined,
      professionalId: null,
      professionalName: null,
      date: undefined,
      slotStart: undefined,
      customerName: "",
      customerEmail: null,
      customerPhone: "",
      notes: null,
    }),
}));
