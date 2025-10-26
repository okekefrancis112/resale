import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plane, Shield, Zap, Check, ArrowRight, AlertCircle, Users, Download, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ResaleLanding() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: 'buyer',
    reason: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [totalSignups, setTotalSignups] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [signups, setSignups] = useState([]);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const ADMIN_EMAIL = 'okeke98@gmail.com';

  useEffect(() => {
    loadSignupCount();
    trackPageView();
  }, []);

  const loadSignupCount = async () => {
    try {
      const { count, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalSignups(count || 0);
    } catch (error) {
      console.error('Error loading signup count:', error);
    }
  };

  const trackPageView = () => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Resale Landing Page',
        page_location: window.location.href
      });
    }
  };

  const trackEvent = (eventName, params = {}) => {
    if (window.gtag) {
      window.gtag('event', eventName, params);
    }
    console.log('Event tracked:', eventName, params);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      trackEvent('form_validation_failed', { errors: Object.keys(errors) });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('waitlist')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            user_type: formData.userType,
            reason: formData.reason || null
          }
        ])
        .select();

      if (error) throw error;

      await loadSignupCount();

      trackEvent('waitlist_signup', {
        user_type: formData.userType,
        has_reason: !!formData.reason
      });

      setSubmitted(true);
      setLoading(false);
    } catch (error) {
      console.error('Error saving signup:', error);
      setErrors({ submit: 'Failed to save your information. Please try again.' });
      setLoading(false);

      trackEvent('signup_error', { error: error.message });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      userType: 'buyer',
      reason: ''
    });
    setErrors({});
  };

  const loadAllSignups = async () => {
    setLoadingSignups(true);
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setSignups(data || []);
    } catch (error) {
      console.error('Error loading signups:', error);
      alert('Failed to load signups. Please try again.');
    }
    setLoadingSignups(false);
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'User Type', 'Reason', 'Timestamp'];
    const rows = signups.map(s => [
      s.name,
      s.email,
      s.phone,
      s.user_type,
      s.reason || '',
      new Date(s.timestamp).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resale-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    trackEvent('export_signups', { count: signups.length });
  };

  const toggleAdmin = () => {
    if (!isAdmin) {
      setShowAdminLogin(true);
    } else {
      if (!showAdmin) {
        loadAllSignups();
      }
      setShowAdmin(!showAdmin);
    }
  };

  const handleAdminLogin = () => {
    if (adminEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setShowAdmin(true);
      loadAllSignups();
      trackEvent('admin_login_success');
    } else {
      alert('Access denied. Only authorized admin can view signups.');
      trackEvent('admin_login_failed');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h2>
          <p className="text-gray-600 mb-4">
            Thanks for joining the Resale waitlist. We'll notify you as soon as we launch!
          </p>
          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              You're signup <span className="font-bold text-orange-600">#{totalSignups}</span>
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-orange-600 font-medium hover:text-orange-700"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
              <button
                onClick={() => setShowAdminLogin(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Enter your admin email to access the waitlist dashboard
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="adminEmail"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="your@email.com"
                  autoFocus
                />
              </div>

              <button
                onClick={handleAdminLogin}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
              >
                Access Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdmin && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Waitlist Admin</h2>
                <p className="text-orange-100 mt-1">Total Signups: {signups.length}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadCSV}
                  disabled={signups.length === 0}
                  className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={toggleAdmin}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="bg-orange-100 border-l-4 border-orange-600 p-4 mx-6">
              <p className="text-sm text-orange-900">
                <span className="font-semibold">Logged in as:</span> {ADMIN_EMAIL}
              </p>
            </div>

            <div className="overflow-auto max-h-[calc(90vh-180px)]">
              {loadingSignups ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-gray-600">Loading signups...</div>
                </div>
              ) : signups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Users className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-600">No signups yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {signups.map((signup) => (
                        <tr key={signup.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{signup.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{signup.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{signup.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              signup.user_type === 'buyer'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {signup.user_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{signup.reason || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(signup.timestamp).toLocaleDateString()} {new Date(signup.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">Resale</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleAdmin}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition flex items-center space-x-2"
                title="View Signups"
              >
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Admin</span>
              </button>
              <button
                onClick={() => {
                  document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' });
                  trackEvent('cta_click', { location: 'nav' });
                }}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700 transition"
              >
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>Built on Bitcoin via Stacks</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Turn Your Clutter Into Cash.<br />
            <span className="text-orange-600">Fast & Secure.</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10">
            Whether you're relocating abroad or just decluttering, sell quality items quickly while buyers get amazing deals. Powered by blockchain for trust and security.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' });
                trackEvent('cta_click', { location: 'hero' });
              }}
              className="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2"
            >
              <span>Join Waitlist</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' });
                trackEvent('learn_more_click');
              }}
              className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-gray-300 hover:border-gray-400 transition"
            >
              Learn More
            </button>
          </div>

          {totalSignups > 0 && (
            <div className="mt-8 inline-block bg-white px-6 py-3 rounded-full shadow-md">
              <p className="text-gray-700">
                🎉 <span className="font-bold text-orange-600">{totalSignups}</span> people have joined the waitlist!
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">Fast</div>
            <p className="text-gray-600">List items in minutes</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">Secure</div>
            <p className="text-gray-600">Blockchain-backed escrow</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">Trusted</div>
            <p className="text-gray-600">Verified buyers & sellers</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How Resale Works</h2>
            <p className="text-xl text-gray-600">Simple, secure, and built for Nigeria</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plane className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">For Sellers</h3>
              <p className="text-gray-600">
                Planning to japa or just decluttering? List your items quickly, set your price, and get cash fast. Perfect for furniture, electronics, and household items.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">For Buyers</h3>
              <p className="text-gray-600">
                Get quality pre-loved items at unbeatable prices. Browse verified listings, chat with sellers, and enjoy secure transactions backed by blockchain.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Transactions</h3>
              <p className="text-gray-600">
                Built on Stacks blockchain with Bitcoin security. Smart contract escrow protects both buyers and sellers throughout the transaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Perfect For</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-3xl mb-4">✈️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Relocating Abroad (Japa)</h3>
              <p className="text-gray-600">
                Need quick cash for flights and logistics? Can't take everything with you? Sell your items fast and fund your journey.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-3xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Decluttering & Downsizing</h3>
              <p className="text-gray-600">
                Moving to a smaller place or just want a fresh start? Turn unused items into cash instead of letting them gather dust.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-3xl mb-4">🎓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Students & Young Professionals</h3>
              <p className="text-gray-600">
                Get quality furniture, electronics, and essentials at student-friendly prices. Perfect for setting up your first apartment.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-3xl mb-4">💚</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sustainable Living</h3>
              <p className="text-gray-600">
                Give items a second life instead of contributing to waste. Buy pre-loved, save money, and help the environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="waitlist" className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Join the Waitlist</h2>
            <p className="text-xl text-gray-600">
              Be among the first to experience the easiest way to buy and sell in Nigeria
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl shadow-xl">
            {errors.submit && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+234 800 000 0000"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I'm interested as a: *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'userType', value: 'buyer' } })}
                    className={`px-4 py-3 border-2 rounded-lg transition text-center font-medium ${
                      formData.userType === 'buyer'
                        ? 'border-orange-600 bg-orange-50 text-orange-900'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: 'userType', value: 'seller' } })}
                    className={`px-4 py-3 border-2 rounded-lg transition text-center font-medium ${
                      formData.userType === 'seller'
                        ? 'border-orange-600 bg-orange-50 text-orange-900'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Seller
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you interested in Resale? (Optional)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  value={formData.reason}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Tell us what you're looking to buy or sell..."
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Joining...</span>
                ) : (
                  <>
                    <span>Join Waitlist</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By joining, you agree to receive updates about Resale. We respect your privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <ShoppingBag className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold">Resale</span>
            </div>
            <div className="text-gray-400 text-center md:text-right">
              <p>Built on Stacks • Secured by Bitcoin</p>
              <p className="text-sm mt-2">© 2025 Resale. Coming Soon.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}