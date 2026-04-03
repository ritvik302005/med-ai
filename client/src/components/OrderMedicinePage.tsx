import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Medicine } from '../data/medicineDb';
import { searchMedicines } from '../services/api';

interface CartItem extends Medicine {
  quantity: number;
  variant: 'branded' | 'generic';
}

interface LocationState {
  preselectedMedicine?: Medicine;
  variant?: 'branded' | 'generic';
}

type Step = 'browse' | 'cart' | 'address' | 'payment' | 'confirmed';

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function createCartItem(medicine: Medicine, variant: 'branded' | 'generic'): CartItem {
  return {
    ...medicine,
    quantity: 1,
    variant,
  };
}

export default function OrderMedicinePage() {
  const location = useLocation();
  const routeState = (location.state as LocationState | null) || null;
  const [step, setStep] = useState<Step>('browse');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    line1: '',
    city: '',
    pincode: '',
  });
  const [placing, setPlacing] = useState(false);
  const [orderId] = useState(() => `ORD${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
  const prefetchedSelection = useRef(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const response = await searchMedicines('', 1, 12);
        setResults(response.medicines);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load medicines.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError('');

      try {
        const response = await searchMedicines(query.trim(), 1, 12);
        setResults(response.medicines);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Search is unavailable right now.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!routeState?.preselectedMedicine || prefetchedSelection.current) {
      return;
    }

    const variant = routeState.variant || 'generic';
    prefetchedSelection.current = true;
    setQuery(routeState.preselectedMedicine.brandedName);
    setResults((current) => {
      if (current.some((medicine) => medicine.id === routeState.preselectedMedicine?.id)) {
        return current;
      }

      return [routeState.preselectedMedicine as Medicine, ...current];
    });
    setCart([createCartItem(routeState.preselectedMedicine, variant)]);
    setStep('cart');
  }, [routeState]);

  const addToCart = (medicine: Medicine, variant: 'branded' | 'generic') => {
    setCart((current) => {
      const key = `${medicine.id}-${variant}`;
      const existingItem = current.find((item) => `${item.id}-${item.variant}` === key);

      if (existingItem) {
        return current.map((item) =>
          `${item.id}-${item.variant}` === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, createCartItem(medicine, variant)];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          `${item.id}-${item.variant}` === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => {
    const unitPrice = item.variant === 'branded' ? item.brandedPrice : item.genericPrice;
    return sum + unitPrice * item.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    setPlacing(false);
    setStep('confirmed');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-500 pt-20">
      <header className="sticky top-20 z-40 border-b border-[var(--grid)] bg-[var(--bg)]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-12">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 transition-colors hover:bg-[var(--text)]/10">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="mb-1 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Feature</p>
              <h1 className="text-sm font-black uppercase tracking-[0.2em]">Order Medicine</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {(['browse', 'cart', 'address', 'payment'] as Step[]).map((currentStep, index) => (
              <div key={currentStep} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center border-2 text-[8px] font-black transition-all ${
                    step === currentStep
                      ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                      : ['cart', 'address', 'payment', 'confirmed'].indexOf(step) > index
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--grid)] opacity-30'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 ? <div className="h-px w-8 bg-[var(--grid)]" /> : null}
              </div>
            ))}
          </div>

          {step === 'browse' ? (
            <button
              onClick={() => setStep('cart')}
              className="relative flex items-center gap-3 bg-[var(--text)] px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg)] transition-opacity hover:opacity-80"
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[8px] font-black text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'browse' ? (
          <motion.div
            key="browse"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto max-w-6xl px-6 py-10 md:px-12"
          >
            <div className="mb-8 border-4 border-[var(--text)] p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="mb-2 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                    Search medicines to order
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                    Live medicine search is connected to your backend. Checkout remains demo-ready for now.
                  </p>
                </div>
                {cartCount > 0 ? (
                  <button
                    onClick={() => setStep('cart')}
                    className="inline-flex items-center gap-2 border-2 border-[var(--text)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    View Cart
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type medicine name..."
                  className="w-full border-2 border-[var(--text)] bg-transparent p-4 pr-14 text-lg font-black uppercase tracking-tight focus:outline-none"
                />
                {loading ? (
                  <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin opacity-50" />
                ) : (
                  <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-40" />
                )}
              </div>
              {loadError ? (
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-red-600">
                  {loadError}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((medicine) => (
                <motion.div
                  key={medicine.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-4 border-2 border-[var(--text)] p-6 transition-all hover:shadow-[4px_4px_0px_0px_var(--text)]"
                >
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight leading-tight">
                      {medicine.brandedName}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] opacity-50">
                      {medicine.genericName}
                    </p>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
                      {medicine.composition}
                    </p>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <div className="border border-[var(--grid)] p-3">
                      <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Branded</p>
                      <p className="mt-1 text-sm font-black">{money.format(medicine.brandedPrice)}</p>
                      <button
                        onClick={() => addToCart(medicine, 'branded')}
                        className="mt-2 flex w-full items-center justify-center gap-1 bg-[var(--text)] px-2 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--bg)] transition-opacity hover:opacity-80"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                    <div className="relative border-2 border-[var(--accent)] p-3">
                      <span className="absolute -top-2 left-2 bg-[var(--accent)] px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-white">
                        Save
                      </span>
                      <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Generic</p>
                      <p className="mt-1 text-sm font-black text-[var(--accent)]">
                        {money.format(medicine.genericPrice)}
                      </p>
                      <button
                        onClick={() => addToCart(medicine, 'generic')}
                        className="mt-2 flex w-full items-center justify-center gap-1 bg-[var(--accent)] px-2 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-80"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {!loading && results.length === 0 ? (
              <section className="mt-8 border-2 border-dashed border-[var(--grid)] p-12 text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-40">
                  No medicines found for this search.
                </p>
              </section>
            ) : null}

            {cartCount > 0 ? (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2"
              >
                <button
                  onClick={() => setStep('cart')}
                  className="flex items-center gap-6 bg-[var(--text)] px-8 py-4 text-[var(--bg)] shadow-2xl transition-opacity hover:opacity-90"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">{cartCount} items</span>
                  <div className="h-5 w-px bg-[var(--bg)]/30" />
                  <span className="text-xs font-black">{money.format(cartTotal)}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}

        {step === 'cart' ? (
          <motion.div
            key="cart"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="mx-auto max-w-3xl px-6 py-10 md:px-12"
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Step 2</p>
                <h2 className="text-3xl font-black uppercase tracking-tight">Your Cart</h2>
              </div>
              <button
                onClick={() => setStep('browse')}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 transition-opacity hover:opacity-100"
              >
                <Plus className="h-4 w-4" />
                Add More
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--grid)] p-16 text-center">
                <ShoppingCart className="mx-auto mb-4 h-12 w-12 opacity-20" />
                <p className="text-sm font-black uppercase tracking-[0.3em] opacity-40">Cart is empty</p>
                <button
                  onClick={() => setStep('browse')}
                  className="mt-6 bg-[var(--text)] px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--bg)]"
                >
                  Browse Medicines
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8 space-y-3">
                  {cart.map((item) => {
                    const key = `${item.id}-${item.variant}`;
                    const unitPrice = item.variant === 'branded' ? item.brandedPrice : item.genericPrice;

                    return (
                      <div key={key} className="flex items-center gap-4 border-2 border-[var(--text)] p-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black uppercase tracking-tight">{item.brandedName}</h4>
                            <span
                              className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                                item.variant === 'generic'
                                  ? 'bg-[var(--accent)] text-white'
                                  : 'bg-[var(--text)]/10'
                              }`}
                            >
                              {item.variant}
                            </span>
                          </div>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">
                            {item.genericName}
                          </p>
                          <p className="mt-2 text-sm font-black">
                            {money.format(unitPrice)} x {item.quantity} = {money.format(unitPrice * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(key, -1)}
                            className="flex h-8 w-8 items-center justify-center border-2 border-[var(--text)] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center font-black">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(key, 1)}
                            className="flex h-8 w-8 items-center justify-center border-2 border-[var(--text)] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() =>
                              setCart((current) =>
                                current.filter((cartItem) => `${cartItem.id}-${cartItem.variant}` !== key)
                              )
                            }
                            className="ml-2 flex h-8 w-8 items-center justify-center border-2 border-red-500 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-6 border-4 border-[var(--text)] p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Subtotal</span>
                    <span className="font-black">{money.format(cartTotal)}</span>
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Delivery</span>
                    <span className="font-black text-green-500">FREE</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--grid)] pt-3">
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Total</span>
                    <span className="text-2xl font-black">{money.format(cartTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep('address')}
                  disabled={cart.length === 0}
                  className="flex w-full items-center justify-center gap-3 bg-[var(--text)] py-5 font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-30"
                >
                  Continue to Delivery
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}
          </motion.div>
        ) : null}

        {step === 'address' ? (
          <motion.div
            key="address"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="mx-auto max-w-2xl px-6 py-10 md:px-12"
          >
            <div className="mb-8">
              <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Step 3</p>
              <h2 className="flex items-center gap-3 text-3xl font-black uppercase tracking-tight">
                <MapPin className="h-7 w-7" />
                Delivery Address
              </h2>
            </div>

            <div className="space-y-4">
              {[
                { key: 'name', label: 'Full Name', placeholder: 'Your name' },
                { key: 'phone', label: 'Mobile Number', placeholder: '+91 XXXXX XXXXX' },
                { key: 'line1', label: 'Address', placeholder: 'House / Flat / Street' },
                { key: 'city', label: 'City', placeholder: 'City' },
                { key: 'pincode', label: 'PIN Code', placeholder: '110001' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="border-2 border-[var(--text)] p-4">
                  <label className="mb-2 block text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={address[key as keyof typeof address]}
                    onChange={(event) =>
                      setAddress((current) => ({ ...current, [key]: event.target.value }))
                    }
                    placeholder={placeholder}
                    className="w-full bg-transparent text-sm font-bold uppercase tracking-[0.1em] placeholder:opacity-20 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('payment')}
              disabled={!address.name || !address.phone || !address.line1 || !address.city || !address.pincode}
              className="mt-8 flex w-full items-center justify-center gap-3 bg-[var(--text)] py-5 font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              Continue to Payment
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        ) : null}

        {step === 'payment' ? (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="mx-auto max-w-2xl px-6 py-10 md:px-12"
          >
            <div className="mb-8">
              <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Step 4</p>
              <h2 className="flex items-center gap-3 text-3xl font-black uppercase tracking-tight">
                <CreditCard className="h-7 w-7" />
                Payment
              </h2>
            </div>

            <div className="mb-8 space-y-3">
              {[
                { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when your order arrives' },
                { id: 'upi', label: 'UPI / GPay / PhonePe', sub: 'Instant payment via UPI' },
                { id: 'card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
              ].map(({ id, label, sub }, index) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-5 border-2 p-5 transition-all ${
                    index === 0
                      ? 'border-[var(--text)] bg-[var(--text)]/5'
                      : 'cursor-not-allowed border-[var(--grid)] opacity-50'
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center border-2 border-[var(--text)] ${
                      index === 0 ? '' : 'opacity-30'
                    }`}
                  >
                    {index === 0 ? <div className="h-2.5 w-2.5 bg-[var(--text)]" /> : null}
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.1em]">{label}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] opacity-50">{sub}</p>
                  </div>
                  {index !== 0 ? (
                    <span className="ml-auto border border-[var(--grid)] px-2 py-1 text-[8px] font-black uppercase tracking-widest opacity-40">
                      Soon
                    </span>
                  ) : null}
                </label>
              ))}
            </div>

            <div className="mb-8 border-2 border-[var(--grid)] p-5">
              <p className="mb-3 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Order Summary</p>
              <div className="mb-3 space-y-1.5">
                {cart.map((item) => (
                  <div
                    key={`${item.id}-${item.variant}`}
                    className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em]"
                  >
                    <span className="opacity-70">
                      {item.brandedName} x {item.quantity}
                    </span>
                    <span>
                      {money.format(
                        (item.variant === 'branded' ? item.brandedPrice : item.genericPrice) *
                          item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-[var(--grid)] pt-3">
                <span className="text-xs font-black uppercase tracking-[0.2em]">Total</span>
                <span className="text-lg font-black">{money.format(cartTotal)}</span>
              </div>
              <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.3em] opacity-50">
                Deliver to: {address.line1}, {address.city} - {address.pincode}
              </p>
            </div>

            <button
              onClick={() => void handlePlaceOrder()}
              disabled={placing}
              className="flex w-full items-center justify-center gap-3 bg-[var(--text)] py-5 font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-60"
            >
              {placing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <Package className="h-5 w-5" />
                  Place Order - {money.format(cartTotal)}
                </>
              )}
            </button>
          </motion.div>
        ) : null}

        {step === 'confirmed' ? (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-2xl px-6 py-20 text-center md:px-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-8 flex h-24 w-24 items-center justify-center border-4 border-green-500"
            >
              <CheckCircle className="h-14 w-14 text-green-500" />
            </motion.div>

            <h2 className="mb-3 text-5xl font-black uppercase tracking-tight">Order Placed</h2>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
              Order ID: {orderId}
            </p>
            <p className="mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">
              Demo checkout complete. Connect this screen to a real order API when you are ready.
            </p>

            <div className="mb-8 border-4 border-[var(--text)] p-8 text-left">
              <div className="mb-6 flex items-center gap-4">
                <Truck className="h-6 w-6" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] opacity-50">Estimated delivery</p>
                  <p className="font-black uppercase tracking-tight">2-4 Business Days</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="h-6 w-6" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] opacity-50">Delivering to</p>
                  <p className="font-black uppercase tracking-tight">
                    {address.line1 || 'Address pending'}, {address.city || 'City pending'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => {
                  setCart([]);
                  setQuery('');
                  setStep('browse');
                }}
                className="flex-1 border-2 border-[var(--text)] py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
              >
                Order More
              </button>
              <Link
                to="/dashboard"
                className="flex-1 bg-[var(--text)] py-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80"
              >
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
