import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export type IncomingBookingRequest = {
  bookingId: string;
  serviceType: string;
  price: number;
  location?: GeoPoint;
  customerId: string;
  customerName?: string;
  bookingTime?: string;
};

export type BookingUpdate = {
  bookingId: string;
  status: 'accepted' | 'declined';
};

export type PaymentReceived = {
  bookingId: string;
  amount: number;
};

type RespondBookingPayload = {
  bookingId: string;
  status: 'accepted' | 'declined';
  customerId: string;
};

interface SocketContextValue {
  connected: boolean;
  socketId: string | null;
  incomingRequest: IncomingBookingRequest | null;
  bookingUpdate: BookingUpdate | null;
  paymentReceived: PaymentReceived | null;
  respondBooking: (payload: RespondBookingPayload) => void;
  clearIncomingRequest: () => void;
  clearBookingUpdate: () => void;
  clearPaymentReceived: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<IncomingBookingRequest | null>(null);
  const [bookingUpdate, setBookingUpdate] = useState<BookingUpdate | null>(null);
  const [paymentReceived, setPaymentReceived] = useState<PaymentReceived | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      setSocketId(null);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setSocketId(socket.id ?? null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setSocketId(null);
    });

    socket.on('new_booking_request', (payload: IncomingBookingRequest) => {
      if (user?.role === 'technician') {
        setIncomingRequest(payload);
      }
    });

    socket.on('booking_update', (payload: BookingUpdate) => {
      if (user?.role === 'customer') {
        setBookingUpdate(payload);
      }
    });

    socket.on('payment_received', (payload: PaymentReceived) => {
      if (user?.role === 'technician') {
        setPaymentReceived(payload);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_booking_request');
      socket.off('booking_update');
      socket.off('payment_received');
      socket.disconnect();
    };
  }, [token, user?.role]);

  const respondBooking = (payload: RespondBookingPayload) => {
    if (!socketRef.current) return;
    socketRef.current.emit('respond_booking', payload);
  };

  const clearIncomingRequest = () => setIncomingRequest(null);
  const clearBookingUpdate = () => setBookingUpdate(null);
  const clearPaymentReceived = () => setPaymentReceived(null);

  const value = useMemo(
    () => ({
      connected,
      socketId,
      incomingRequest,
      bookingUpdate,
      paymentReceived,
      respondBooking,
      clearIncomingRequest,
      clearBookingUpdate,
      clearPaymentReceived,
    }),
    [connected, socketId, incomingRequest, bookingUpdate, paymentReceived]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used inside <SocketProvider>');
  return context;
}
