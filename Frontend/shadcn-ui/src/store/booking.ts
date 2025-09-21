import { create } from 'zustand';

type BookingState = {
  serviceId?: string;
  serviceName?: string; // Nombre descriptivo del servicio.
  professionalId?: string | null;
  professionalName?: string | null;
  date?: string; // YYYY-MM-DD
  slotStart?: string; // ISO string
  setService: (serviceId: string, serviceName?: string) => void;
  setProfessional: (proId: string | null, proName?: string | null) => void;
  setDate: (date: string) => void;
  setSlot: (isoStart: string) => void;
  reset: () => void;
};

export const useBooking = create<BookingState>((set) => ({
  serviceId: undefined,
  serviceName: undefined,
  professionalId: null,
  professionalName: null,
  date: undefined,
  slotStart: undefined,
  setService: (serviceId, serviceName) =>
    set((state) => {
      if (state.serviceId === serviceId) {
        return {
          serviceId,
          serviceName: serviceName ?? state.serviceName,
        };
      }

      return {
        serviceId,
        serviceName,
        professionalId: null,
        professionalName: null,
        date: undefined,
        slotStart: undefined,
      };
    }),
  setProfessional: (professionalId, professionalName = null) =>
    set({ professionalId, professionalName }),
  setDate: (date) => set({ date, slotStart: undefined }),
  setSlot: (isoStart) => set({ slotStart: isoStart }),
  reset: () =>
    set({
      serviceId: undefined,
      serviceName: undefined,
      professionalId: null,
      professionalName: null,
      date: undefined,
      slotStart: undefined,
    }),
}));
