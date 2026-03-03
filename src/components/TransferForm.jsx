import { useState, useEffect } from 'react';
import { Save, Plane, User, MapPin, Truck, Calendar, Users as UsersIcon, Car, Plus, XCircle, ChevronRight, ChevronLeft, CheckCircle2, UserPlus, Building2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import { startOfDay } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Drawer from './Drawer';
import Dropdown from './Dropdown';
import { motion, AnimatePresence } from 'framer-motion';

const TransferForm = ({ onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const isClient = isRole('CLIENT');

  const [currentStep, setCurrentStep] = useState(1);
  const [createdTransferId, setCreatedTransferId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    // Delegate 1 (event format)
    jobPosition: '',
    companyName: '',
    flightBooked: false,
    arrivalFlightNo: '',
    arrivalDateTime: '',
    departureFlightNo: '',
    departureDateTime: '',
    consentEmail: false,
    consentWhatsapp: false,
    whatsappNumber: '',
    // Additional delegates (from Travelers); user can add as many as needed
    additionalDelegates: [],
    //
    pickupLocation: '',
    dropLocation: '',
    eventPlace: '',
    vendorId: '',
    vendorName: '',
    vendorContact: '',
    vendorPhone: '',
    vendorEmail: '',
    travelerId: '',
    travelerName: '',
    travelerEmail: '',
    travelerPhone: '',
    // Return transfer (mandatory by default)
    includeReturn: true,
    returnFlightNo: '',
    returnAirline: '',
    returnDepartureAirport: '',
    returnArrivalAirport: '',
    returnDepartureDateTime: '',
    returnArrivalDateTime: '',
    returnPickupLocation: '',
    returnDropLocation: '',
    returnEventPlace: '',
    returnEstimatedPickupTime: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [travelers, setTravelers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingTravelers, setLoadingTravelers] = useState(false);
  const [addDelegateSelectValue, setAddDelegateSelectValue] = useState('');

  const totalSteps = isClient ? 2 : 3;

  useEffect(() => {
    if (isClient) {
      setCustomerFromUser();
      fetchTravelers();
    } else {
      fetchCustomers();
      fetchVendors();
    }
  }, [isClient]);

  const setCustomerFromUser = () => {
    if (!user) return;
    const id = user._id || user.id || user.userId;
    const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ').trim() || user.username || user.email || 'Client';
    setFormData(prev => ({
      ...prev,
      customerId: id,
      customerName: name,
      customerEmail: user.email || '',
      customerPhone: user.profile?.phone || user.phone || ''
    }));
  };

  const toDatetimeLocal = (d) => {
    if (!d || !(d instanceof Date)) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const getMinTimeForFilter = () => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
    d.setSeconds(0, 0);
    return d;
  };
  const getDefaultArrivalTime = (departureTime) => {
    if (!departureTime) return '';
    const d = new Date(departureTime);
    d.setHours(d.getHours() + 24);
    return toDatetimeLocal(d);
  };

  const fetchTravelers = async () => {
    setLoadingTravelers(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/travelers`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setTravelers(data.success && Array.isArray(data.data) ? data.data : []);
      } else {
        setTravelers([]);
      }
    } catch (e) {
      console.error('Error fetching travelers:', e);
      setTravelers([]);
    } finally {
      setLoadingTravelers(false);
    }
  };

  // Clear ALL errors whenever step changes (when user navigates between steps)
  useEffect(() => {
    setErrors({});
  }, [currentStep]);

  useEffect(() => {
    if (user && isClient) setCustomerFromUser();
  }, [user, isClient]);

  useEffect(() => {
    if (formData.vendorId && vendors.length > 0) {
      fetchVendorDetails(formData.vendorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.vendorId]);
  
  useEffect(() => {
    if (formData.vendorId && vendors.length > 0) {
      fetchVendorDetails(formData.vendorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to continue');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/users/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const customerList = Array.isArray(data.data) ? data.data : [];
          console.log('Fetched customers:', customerList);
          setCustomers(customerList);
        } else {
          setCustomers([]);
        }
      } else {
        console.error('Failed to fetch clients:', response.status);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to continue');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/users/vendors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Vendors API response:', data);
        if (data.success && data.data) {
          // Get VENDOR role users from User model
          const allVendors = Array.isArray(data.data) ? data.data : [];
          setVendors(allVendors);
          console.log('Vendors loaded:', allVendors.length);
          
          if (allVendors.length === 0) {
            console.warn('No vendors found in API response');
          }
        } else {
          console.error('Vendors API returned unsuccessful response:', data);
          setVendors([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch vendors:', response.status, errorData);
        setVendors([]);
        toast.error(errorData.message || 'Failed to fetch vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to fetch vendors');
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchVendorDetails = async (vendorId) => {
    try {
      if (!vendorId) return;
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const token = localStorage.getItem('token');
      
      // First try to find vendor in local state (from User model)
      let vendor = vendors.find(v => v._id === vendorId || v.vendorId === vendorId);
      
      // If not found locally, try fetching from User model endpoint
      if (!vendor) {
        const response = await fetch(`${API_BASE_URL}/users/${vendorId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            vendor = data.data;
          } else {
            console.error('Vendor not found in API response');
            return;
          }
        } else {
          console.error('Failed to fetch vendor:', response.status);
          return;
        }
      }
      
      if (vendor) {
        // Handle both User model structure (vendorDetails, profile) and Vendor model structure (companyName, contactPerson)
        const vendorName = vendor.vendorDetails?.companyName || vendor.companyName || '';
        const vendorContact = vendor.profile 
          ? `${vendor.profile.firstName || ''} ${vendor.profile.lastName || ''}`.trim()
          : `${vendor.contactPerson?.firstName || ''} ${vendor.contactPerson?.lastName || ''}`.trim();
        const vendorPhone = vendor.profile?.phone || vendor.contactPerson?.phone || '';
        const vendorEmail = vendor.email || vendor.contactPerson?.email || '';
        
        setFormData(prev => ({
          ...prev,
          vendorName: vendorName,
          vendorContact: vendorContact,
          vendorPhone: vendorPhone,
          vendorEmail: vendorEmail
        }));
      } else {
        console.error('Vendor not found:', vendorId);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      toast.error('Failed to fetch vendor details');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle customer selection
    if (name === 'customerId') {
      const selectedIdStr = String(value || '').trim();
      const customer = customers.find(c => {
        const customerId = String(c._id || c._id?.toString() || '').trim();
        return customerId === selectedIdStr;
      });
      if (customer) {
        const customerIdStr = customer._id?.toString() || String(customer._id || '');
        const customerData = {
          customerId: customerIdStr,
          customerName: `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim(),
          customerEmail: customer.email || '',
          customerPhone: customer.profile?.phone || customer.phone || ''
        };
        
        console.log('Full customer object:', customer);
        console.log('Customer data being set:', customerData);
        
        setFormData(prev => ({
          ...prev,
          ...customerData
        }));
        
        // Clear customer-related errors when customer is selected
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.customerId;
          delete newErrors.customerName;
          delete newErrors.customerEmail;
          delete newErrors.customerPhone;
          return newErrors;
        });
      } else if (!value) {
        // Clear customer data if empty selection
        setFormData(prev => ({
          ...prev,
          customerId: '',
          customerName: '',
          customerEmail: '',
          customerPhone: ''
        }));
      }
      return;
    }

    // Handle traveler selection (client flow)
    if (name === 'travelerId') {
      const selectedIdStr = String(value || '').trim();
      const traveler = travelers.find(t => String(t._id || t._id?.toString() || '') === selectedIdStr);
      if (traveler) {
        const travelerName = [traveler.profile?.firstName, traveler.profile?.lastName].filter(Boolean).join(' ').trim() || traveler.username || '';
        setFormData(prev => ({
          ...prev,
          travelerId: selectedIdStr,
          travelerName,
          travelerEmail: traveler.email || '',
          travelerPhone: traveler.profile?.phone || traveler.phone || ''
        }));
      } else if (!value) {
        setFormData(prev => ({
          ...prev,
          travelerId: '',
          travelerName: '',
          travelerEmail: '',
          travelerPhone: ''
        }));
      }
      return;
    }

    // Handle vendor selection
    if (name === 'vendorId') {
      const selectedIdStr = String(value || '').trim();
      const selectedVendor = vendors.find(v => {
        const vendorId = String(v._id || v._id?.toString() || '').trim();
        return vendorId === selectedIdStr;
      });
      
      if (selectedVendor) {
        const vendorName = selectedVendor.vendorDetails?.companyName || selectedVendor.companyName || '';
        const vendorIdStr = String(selectedVendor._id || selectedVendor._id?.toString() || '');
        
        // Set vendor info
        setFormData(prev => ({
          ...prev,
          vendorId: vendorIdStr,
          vendorName: vendorName,
          vendorContact: selectedVendor.profile 
            ? `${selectedVendor.profile?.firstName || ''} ${selectedVendor.profile?.lastName || ''}`.trim()
            : (selectedVendor.contactPerson 
              ? `${selectedVendor.contactPerson?.firstName || ''} ${selectedVendor.contactPerson?.lastName || ''}`.trim()
              : ''),
          vendorPhone: selectedVendor.profile?.phone || selectedVendor.contactPerson?.phone || '',
          vendorEmail: selectedVendor.email || selectedVendor.contactPerson?.email || ''
        }));
        
        // Fetch vendor details from API (to get latest data)
        fetchVendorDetails(vendorIdStr);
      } else if (!value) {
        // Clear vendor data if empty selection
        setFormData(prev => ({
          ...prev,
          vendorId: '',
          vendorName: '',
          vendorContact: '',
          vendorPhone: '',
          vendorEmail: ''
        }));
      }
      
      // Clear vendorId error when vendor is selected
      if (errors.vendorId) {
        setErrors(prev => ({ ...prev, vendorId: null }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (isClient) {
      if (!formData.customerId) newErrors.customerId = 'Your account is required';
      if (!formData.customerName?.trim()) newErrors.customerName = 'Full name is required';
      if (!formData.customerEmail?.trim()) newErrors.customerEmail = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) newErrors.customerEmail = 'Invalid email format';
      if (!formData.customerPhone?.trim()) newErrors.customerPhone = 'Phone is required';
      else {
        const phone = formData.customerPhone.trim();
        if (!/^\+[1-9]\d{1,14}$/.test(phone) && !/^\d{10,15}$/.test(phone)) {
          newErrors.customerPhone = 'Phone must be valid (e.g., +1234567890 or 1234567890)';
        }
      }
      if (formData.flightBooked) {
        if (!formData.arrivalFlightNo?.trim()) newErrors.arrivalFlightNo = 'Arrival flight number is required';
        if (!formData.arrivalDateTime) newErrors.arrivalDateTime = 'Arrival date & time is required';
        if (!formData.departureFlightNo?.trim()) newErrors.departureFlightNo = 'Departure flight number is required';
        if (!formData.departureDateTime) newErrors.departureDateTime = 'Departure date & time is required';
        if (formData.arrivalDateTime && formData.departureDateTime && new Date(formData.arrivalDateTime) <= new Date(formData.departureDateTime)) {
          newErrors.arrivalDateTime = 'Arrival must be after departure';
        }
      }
      (formData.additionalDelegates || []).forEach((d, idx) => {
        if (!d.travelerId) newErrors[`delegates.${idx}.travelerId`] = 'Please select a delegate';
        else if (!d.flightSameAsPrimary) {
          if (!d.arrivalFlightNo?.trim()) newErrors[`delegates.${idx}.arrivalFlightNo`] = 'Arrival flight number is required';
          if (!d.arrivalDateTime) newErrors[`delegates.${idx}.arrivalDateTime`] = 'Arrival date & time is required';
          if (!d.departureFlightNo?.trim()) newErrors[`delegates.${idx}.departureFlightNo`] = 'Departure flight number is required';
          if (!d.departureDateTime) newErrors[`delegates.${idx}.departureDateTime`] = 'Departure date & time is required';
          if (d.arrivalDateTime && d.departureDateTime && new Date(d.arrivalDateTime) <= new Date(d.departureDateTime)) {
            newErrors[`delegates.${idx}.arrivalDateTime`] = 'Arrival must be after departure';
          }
        }
      });
      return newErrors;
    }
    if (!formData.customerId) newErrors.customerId = 'Please select a client';
    if (!formData.customerName?.trim()) newErrors.customerName = 'Client name is required';
    if (!formData.customerEmail?.trim()) newErrors.customerEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) newErrors.customerEmail = 'Invalid email format';
    if (!formData.customerPhone?.trim()) newErrors.customerPhone = 'Phone is required';
    else {
      const phone = formData.customerPhone.trim();
      if (!/^\+[1-9]\d{1,14}$/.test(phone) && !/^\d{10,15}$/.test(phone)) {
        newErrors.customerPhone = 'Phone must be valid (e.g., +1234567890 or 1234567890)';
      }
    }
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.pickupLocation.trim()) newErrors.pickupLocation = 'Pickup location is required';
    if (!formData.dropLocation.trim()) newErrors.dropLocation = 'Drop location is required';
    if (!formData.eventPlace.trim()) newErrors.eventPlace = 'Event place is required';
    if (formData.includeReturn) {
      if (!formData.returnFlightNo?.trim()) newErrors.returnFlightNo = 'Return flight number is required';
      if (!formData.returnAirline?.trim()) newErrors.returnAirline = 'Return airline is required';
      if (!formData.returnDepartureAirport?.trim()) newErrors.returnDepartureAirport = 'Return departure airport is required';
      if (!formData.returnArrivalAirport?.trim()) newErrors.returnArrivalAirport = 'Return arrival airport is required';
      if (!formData.returnDepartureDateTime) newErrors.returnDepartureDateTime = 'Return departure date & time is required';
      if (!formData.returnArrivalDateTime) newErrors.returnArrivalDateTime = 'Return arrival date & time is required';
      if (formData.returnDepartureDateTime && formData.returnArrivalDateTime && new Date(formData.returnArrivalDateTime) <= new Date(formData.returnDepartureDateTime)) {
        newErrors.returnArrivalDateTime = 'Return arrival must be after return departure';
      }
      if (!formData.returnPickupLocation?.trim()) newErrors.returnPickupLocation = 'Return pickup location is required';
      if (!formData.returnDropLocation?.trim()) newErrors.returnDropLocation = 'Return drop location is required';
      if (!formData.returnEventPlace?.trim()) newErrors.returnEventPlace = 'Return event place is required';
    }
    return newErrors;
  };

  const validateStep3 = () => {
    const newErrors = {};
    // Vendor is optional for admin - they can assign from transfer list later
    return newErrors;
  };

  const validateForm = () => {
    const step1Errors = validateStep1();
    const step2Errors = validateStep2();
    const step3Errors = validateStep3();
    
    // Combine all errors
    const allErrors = { ...step1Errors, ...step2Errors, ...step3Errors };
    
    // Set errors for final submission
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    let stepErrors = {};
    
    if (currentStep === 1) {
      stepErrors = validateStep1();
      if (Object.keys(stepErrors).length > 0) {
        console.log('Step 1 validation failed. Check errors above.');
      }
    } else if (currentStep === 2) {
      stepErrors = validateStep2();
    } else if (currentStep === 3) {
      stepErrors = validateStep3();
    }

    const isValid = Object.keys(stepErrors).length === 0;

    if (isValid) {
      // Clear errors when moving to next step
      setErrors({});
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      // Set errors only when validation fails
      setErrors(stepErrors);
      toast.error('Please fill in all required fields');
      // Scroll to first error after a brief delay to let DOM update
      setTimeout(() => {
        const firstError = document.querySelector('.border-red-500');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handlePrevStep = () => {
    // Clear errors when going back
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to create transfers');
      return;
    }

    setLoading(true);

    try {
      // APEX ID is generated by backend (APX + client name + 5 digits)
      const normalizePhone = (p) => {
        if (!p || typeof p !== 'string') return p;
        const t = p.trim().replace(/\s/g, '');
        if (/^\+[1-9]\d{1,14}$/.test(t)) return t;
        if (/^91\d{10}$/.test(t)) return `+${t}`;
        if (/^9\d{9}$/.test(t)) return `+91${t}`;
        if (/^\d{10,15}$/.test(t)) return `+${t}`;
        return t;
      };

      const nowIso = new Date().toISOString();
      const flightDetailsFromDelegate1 = formData.flightBooked && formData.arrivalDateTime && formData.departureDateTime
        ? {
          flight_no: (formData.arrivalFlightNo || formData.departureFlightNo || 'XX000').trim().toUpperCase().slice(0, 10) || 'XX000',
          airline: 'TBD',
          departure_airport: 'TBD',
          arrival_airport: 'TBD',
          departure_time: new Date(formData.departureDateTime).toISOString(),
          arrival_time: new Date(formData.arrivalDateTime).toISOString(),
          status: 'on_time',
          delay_minutes: 0
        }
        : {
          flight_no: 'XX000',
          airline: 'TBD',
          departure_airport: 'TBD',
          arrival_airport: 'TBD',
          departure_time: nowIso,
          arrival_time: nowIso,
          status: 'on_time',
          delay_minutes: 0
        };

      const transferData = {
        customer_id: formData.customerId,
        customer_details: {
          name: formData.customerName,
          email: formData.customerEmail,
          contact_number: normalizePhone(formData.customerPhone) || formData.customerPhone,
          no_of_passengers: 1 + (formData.additionalDelegates?.length || 0),
          luggage_count: 0,
          job_position: formData.jobPosition || undefined,
          company_name: formData.companyName || undefined,
          consent_email: formData.consentEmail || undefined,
          consent_whatsapp: formData.consentWhatsapp || undefined,
          whatsapp_number: formData.whatsappNumber?.trim() || undefined,
          flight_booked: formData.flightBooked || undefined
        },
        flight_details: flightDetailsFromDelegate1,
        transfer_details: {
          pickup_location: formData.pickupLocation,
          drop_location: formData.dropLocation,
          event_place: formData.eventPlace,
          estimated_pickup_time: new Date().toISOString(),
          special_notes: ''
        }
      };

      if (formData.includeReturn && formData.returnFlightNo?.trim() && formData.returnAirline?.trim() && formData.returnDepartureAirport?.trim() && formData.returnArrivalAirport?.trim() && formData.returnDepartureDateTime && formData.returnArrivalDateTime && formData.returnPickupLocation?.trim() && formData.returnDropLocation?.trim() && formData.returnEventPlace?.trim()) {
        transferData.return_flight_details = {
          flight_no: formData.returnFlightNo.trim().toUpperCase().slice(0, 10),
          airline: formData.returnAirline.trim(),
          departure_airport: formData.returnDepartureAirport.trim().toUpperCase().slice(0, 3),
          arrival_airport: formData.returnArrivalAirport.trim().toUpperCase().slice(0, 3),
          departure_time: new Date(formData.returnDepartureDateTime).toISOString(),
          arrival_time: new Date(formData.returnArrivalDateTime).toISOString(),
          status: 'on_time',
          delay_minutes: 0
        };
        transferData.return_transfer_details = {
          pickup_location: formData.returnPickupLocation.trim(),
          drop_location: formData.returnDropLocation.trim(),
          event_place: formData.returnEventPlace.trim(),
          estimated_pickup_time: formData.returnEstimatedPickupTime ? new Date(formData.returnEstimatedPickupTime).toISOString() : new Date(formData.returnDepartureDateTime).toISOString(),
          special_notes: ''
        };
      }

      if (isClient && Array.isArray(formData.additionalDelegates) && formData.additionalDelegates.length > 0) {
        transferData.delegates = formData.additionalDelegates.map((d) => {
          const entry = {
            traveler_id: d.travelerId,
            flight_same_as_primary: d.flightSameAsPrimary !== false
          };
          if (!entry.flight_same_as_primary && d.arrivalDateTime && d.departureDateTime) {
            entry.flight_details = {
              flight_no: (d.arrivalFlightNo || d.departureFlightNo || 'XX000').trim().toUpperCase().slice(0, 10) || 'XX000',
              airline: 'TBD',
              departure_airport: 'TBD',
              arrival_airport: 'TBD',
              departure_time: new Date(d.departureDateTime).toISOString(),
              arrival_time: new Date(d.arrivalDateTime).toISOString(),
              status: 'on_time',
              delay_minutes: 0
            };
          }
          return entry;
        });
      } else if (isClient && formData.travelerId) {
        transferData.traveler_id = formData.travelerId;
        transferData.traveler_details = {
          name: formData.travelerName,
          email: formData.travelerEmail,
          contact_number: normalizePhone(formData.travelerPhone) || formData.travelerPhone || ''
        };
      }
      if (!isClient && formData.vendorId) {
        const selectedVendor = vendors.find(v => v._id === formData.vendorId || v.vendorId === formData.vendorId);
        const vendorIdString = selectedVendor?._id?.toString() || formData.vendorId;
        transferData.vendor_id = vendorIdString;
        transferData.vendor_details = {
          vendor_id: vendorIdString,
          vendor_name: formData.vendorName,
          contact_person: formData.vendorContact,
          contact_number: formData.vendorPhone,
          email: formData.vendorEmail
        };
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api';
      const response = await fetch(`${API_BASE_URL}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transferData)
      });

      const data = await response.json();

      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        // Clear token and redirect to login
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      if (response.status === 403) {
        toast.error('You do not have permission to create transfers. Admin access required.');
        return;
      }

      if (data.success) {
        setCreatedTransferId(data.data?._id || data.data?.apexId);
        // Don't close immediately - show success step with APEX ID
      } else {
        // Show detailed error message
        let errorMessage = data.message || 'Failed to create transfer';
        
        // If there are validation errors, show them
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const errorDetails = data.errors.map(e => `${e.field}: ${e.message}`).join(', ');
          errorMessage = `Validation error: ${errorDetails}`;
        }
        
        toast.error(errorMessage);
        console.error('Transfer creation failed:', data);
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('Failed to create transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render success step with APEX ID
  if (createdTransferId) {
    return (
      <Drawer
        isOpen={true}
        onClose={onClose}
        title="Transfer Created Successfully!"
        subtitle="Your transfer has been created"
        position="right"
        size="xl"
      >
        <div className="flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mb-6"
          >
            <CheckCircle2 size={80} className="text-green-500" />
          </motion.div>
          <h3 className="text-2xl font-bold text-foreground mb-4">Transfer Created!</h3>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            Your transfer has been successfully created. Use the reference below to track your transfer.
          </p>
          <div className="bg-card border-2 border-primary rounded-lg p-6 mb-6 w-full max-w-md">
            <div className="text-sm text-muted-foreground mb-2">Transfer Reference:</div>
            <div className="flex flex-col items-center justify-center gap-2 mb-3">
              <div className="text-2xl font-bold text-primary text-center">
                {formData.customerName || 'Transfer'}
              </div>
              <div className="text-sm font-mono text-muted-foreground">
                {createdTransferId}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <motion.button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdTransferId);
                  setCopied(true);
                  toast.success('Transfer ID copied to clipboard!');
                  setTimeout(() => setCopied(false), 2000);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                <motion.div
                  initial={false}
                  animate={{ scale: copied ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {copied ? <Check size={24} /> : <Copy size={24} />}
                </motion.div>
              </motion.button>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (onSuccess) onSuccess({ _id: createdTransferId });
                if (onClose) onClose();
              }}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedTransferId(null);
                setCurrentStep(1);
                setFormData({
                  customerId: '',
                  customerName: '',
                  customerEmail: '',
                  customerPhone: '',
                  pickupLocation: '',
                  dropLocation: '',
                  eventPlace: '',
                  vendorId: '',
                  vendorName: '',
                  vendorContact: '',
                  vendorPhone: '',
                  vendorEmail: '',
                  includeReturn: true,
                  returnFlightNo: '',
                  returnAirline: '',
                  returnDepartureAirport: '',
                  returnArrivalAirport: '',
                  returnDepartureDateTime: '',
                  returnArrivalDateTime: '',
                  returnPickupLocation: '',
                  returnDropLocation: '',
                  returnEventPlace: '',
                  returnEstimatedPickupTime: ''
                });
                setErrors({});
              }}
              className="px-6 py-2.5 border border-border rounded-md text-sm font-medium text-foreground bg-card hover:bg-accent transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </Drawer>
    );
  }

  const steps = isClient
    ? [
        { number: 1, title: 'Traveler & Your Details', icon: User },
        { number: 2, title: 'Transfer Details', icon: MapPin }
      ]
    : [
        { number: 1, title: 'Select Client', icon: User },
        { number: 2, title: 'Transfer Details', icon: MapPin },
        { number: 3, title: 'Vendor (Optional)', icon: Truck }
      ];

  return (
    <Drawer
      isOpen={true}
      onClose={onClose}
      title="Add New Transfer"
      subtitle={`Step ${currentStep} of ${totalSteps}`}
      position="right"
      size="xl"
    >
      <div className="flex h-full">
        {/* Stepper Progress Indicator - Vertical */}
        <div className="w-64 py-10 px-6 flex-shrink-0 bg-gradient-to-br from-muted/40 via-muted/20 to-transparent border-r border-border">
          <div className="flex flex-col gap-1">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive
                          ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                          : isCompleted
                          ? 'bg-green-500 border-green-500 text-white shadow-md'
                          : 'bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={22} strokeWidth={2.5} />
                      ) : (
                        <StepIcon size={22} strokeWidth={isActive ? 2.5 : 2} />
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-[3px] my-2 rounded-full overflow-hidden bg-border/40" style={{ height: '52px' }}>
                        <div 
                          className={`w-full transition-all duration-500 rounded-full ${
                            isCompleted ? 'bg-gradient-to-b from-green-500 to-green-400 h-full' : 'h-0'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 pt-2.5 pb-6">
                    <div className={`text-base font-bold transition-colors duration-300 mb-1 ${
                      isActive ? 'text-primary' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Step {step.number} of {totalSteps}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Form Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-background to-muted/10">
          <form onSubmit={(e) => { e.preventDefault(); if (currentStep === totalSteps) handleSubmit(e); }} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-8 pt-8 pb-6 min-h-0">
          <AnimatePresence mode="wait">
            {/* Step 1: Client = Traveler + Your details; Admin = Select Client */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {isClient ? 'Traveler & Your Details' : 'Select Client'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isClient ? 'Select the traveler for this transfer. Vendor will be assigned by admin.' : 'Choose the client for this transfer'}
                  </p>
                </div>
                {isClient ? (
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <User size={20} className="text-primary" />
                        Delegate 1 (Your details)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                          <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} placeholder="Full name" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.customerName ? 'border-red-500' : 'border-input'}`} />
                          {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Job Position / Designation</label>
                          <input type="text" name="jobPosition" value={formData.jobPosition} onChange={handleChange} placeholder="e.g. Manager" className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Company Name</label>
                          <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company" className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                          <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} placeholder="email@example.com" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.customerEmail ? 'border-red-500' : 'border-input'}`} />
                          {errors.customerEmail && <p className="text-xs text-red-500 mt-1">{errors.customerEmail}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Phone Number *</label>
                          <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange} placeholder="+1234567890" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.customerPhone ? 'border-red-500' : 'border-input'}`} />
                          {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-foreground mb-1">Add delegates (from your Travelers)</label>
                          <p className="text-xs text-muted-foreground mb-2">Add as many delegates as needed. Manage delegates on the Travelers page.</p>
                          <Dropdown
                            name="addDelegate"
                            value={addDelegateSelectValue}
                            onChange={(e) => {
                              const id = e.target.value;
                              if (!id) return;
                              const t = travelers.find(x => (x._id || x.id) === id);
                              const name = t ? `${t.profile?.firstName || ''} ${t.profile?.lastName || ''}`.trim() || t.email : '';
                              const used = (formData.additionalDelegates || []).map(d => d.travelerId);
                              if (used.includes(id)) return;
                              setFormData(prev => ({
                                ...prev,
                                additionalDelegates: [...(prev.additionalDelegates || []), {
                                  travelerId: id,
                                  travelerName: name,
                                  flightSameAsPrimary: true,
                                  arrivalFlightNo: '',
                                  arrivalDateTime: '',
                                  departureFlightNo: '',
                                  departureDateTime: ''
                                }]
                              }));
                              setAddDelegateSelectValue('');
                            }}
                            options={[
                              { value: '', label: 'Select a traveler to add as delegate...' },
                              ...(travelers || []).filter(t => !(formData.additionalDelegates || []).some(d => d.travelerId === (t._id || t.id))).map(t => ({
                                value: t._id || t.id,
                                label: `${`${t.profile?.firstName || ''} ${t.profile?.lastName || ''}`.trim() || t.email} (${t.email})`
                              }))
                            ]}
                            placeholder="Select a traveler to add as delegate..."
                            minWidth="100%"
                          />
                        </div>
                      </div>
                      <div className="pt-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                          <input type="checkbox" checked={formData.flightBooked} onChange={(e) => setFormData(prev => ({ ...prev, flightBooked: e.target.checked }))} className="rounded border-input" />
                          Have you already booked your flight for the event?
                        </label>
                      </div>
                      {formData.flightBooked && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Arrival Flight Number *</label>
                            <input type="text" name="arrivalFlightNo" value={formData.arrivalFlightNo} onChange={handleChange} placeholder="e.g. AI202" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.arrivalFlightNo ? 'border-red-500' : 'border-input'}`} />
                            {errors.arrivalFlightNo && <p className="text-xs text-red-500 mt-1">{errors.arrivalFlightNo}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Arrival Date & Time *</label>
                            <DatePicker selected={formData.arrivalDateTime ? new Date(formData.arrivalDateTime) : null} onChange={(date) => setFormData(prev => ({ ...prev, arrivalDateTime: date ? toDatetimeLocal(date) : '' }))} minDate={startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()} popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.arrivalDateTime ? 'border-red-500' : 'border-input'}`} />
                            {errors.arrivalDateTime && <p className="text-xs text-red-500 mt-1">{errors.arrivalDateTime}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Departure Flight Number *</label>
                            <input type="text" name="departureFlightNo" value={formData.departureFlightNo} onChange={handleChange} placeholder="e.g. EK501" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.departureFlightNo ? 'border-red-500' : 'border-input'}`} />
                            {errors.departureFlightNo && <p className="text-xs text-red-500 mt-1">{errors.departureFlightNo}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Departure Date & Time *</label>
                            <DatePicker selected={formData.departureDateTime ? new Date(formData.departureDateTime) : null} onChange={(date) => {
                              if (!date) { setFormData(prev => ({ ...prev, departureDateTime: '' })); return; }
                              const dep = toDatetimeLocal(date);
                              let arr = formData.arrivalDateTime;
                              if (arr && new Date(arr) <= new Date(dep)) arr = getDefaultArrivalTime(dep);
                              setFormData(prev => ({ ...prev, departureDateTime: dep, arrivalDateTime: arr || prev.arrivalDateTime }));
                            }} minDate={startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()} popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.departureDateTime ? 'border-red-500' : 'border-input'}`} />
                            {errors.departureDateTime && <p className="text-xs text-red-500 mt-1">{errors.departureDateTime}</p>}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 pt-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                          <input type="checkbox" checked={formData.consentEmail} onChange={(e) => setFormData(prev => ({ ...prev, consentEmail: e.target.checked }))} className="rounded border-input" />
                          I agree to receive email communication regarding my airport transfers and event travel coordination.
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                          <input type="checkbox" checked={formData.consentWhatsapp} onChange={(e) => setFormData(prev => ({ ...prev, consentWhatsapp: e.target.checked }))} className="rounded border-input" />
                          I consent to receive WhatsApp notifications related to pickup schedules and updates.
                        </label>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">WhatsApp number (if different from phone)</label>
                          <input type="tel" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} placeholder="+1234567890" className="w-full px-4 py-2.5 border border-input rounded-lg bg-background text-foreground" />
                        </div>
                      </div>
                    </section>
                    {(formData.additionalDelegates || []).length > 0 && (
                      <section className="space-y-4 pt-6 border-t border-border">
                        <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <UsersIcon size={20} className="text-primary" />
                          Additional delegates ({formData.additionalDelegates.length})
                        </h4>
                        {(formData.additionalDelegates || []).map((d, idx) => (
                          <div key={d.travelerId + idx} className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">{d.travelerName || 'Delegate'}</span>
                              <button type="button" onClick={() => setFormData(prev => ({ ...prev, additionalDelegates: prev.additionalDelegates.filter((_, i) => i !== idx) }))} className="text-red-600 hover:text-red-700 p-1">
                                <XCircle size={18} />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Flight same as primary?</label>
                                <Dropdown
                                  name={`flightSameAsPrimary_${idx}`}
                                  value={d.flightSameAsPrimary ? 'yes' : 'no'}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    additionalDelegates: prev.additionalDelegates.map((item, i) => i === idx ? { ...item, flightSameAsPrimary: e.target.value === 'yes' } : item)
                                  }))}
                                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                                  minWidth="100%"
                                />
                              </div>
                            </div>
                            {!d.flightSameAsPrimary && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-foreground mb-1">Arrival Flight Number *</label>
                                  <input type="text" value={d.arrivalFlightNo || ''} onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    additionalDelegates: prev.additionalDelegates.map((item, i) => i === idx ? { ...item, arrivalFlightNo: e.target.value } : item)
                                  }))} className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors[`delegates.${idx}.arrivalFlightNo`] ? 'border-red-500' : 'border-input'}`} placeholder="e.g. AI202" />
                                  {errors[`delegates.${idx}.arrivalFlightNo`] && <p className="text-xs text-red-500 mt-1">{errors[`delegates.${idx}.arrivalFlightNo`]}</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-foreground mb-1">Arrival Date & Time *</label>
                                  <DatePicker selected={d.arrivalDateTime ? new Date(d.arrivalDateTime) : null} onChange={(date) => setFormData(prev => ({
                                    ...prev,
                                    additionalDelegates: prev.additionalDelegates.map((item, i) => i === idx ? { ...item, arrivalDateTime: date ? toDatetimeLocal(date) : '' } : item)
                                  }))} minDate={startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()} popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors[`delegates.${idx}.arrivalDateTime`] ? 'border-red-500' : 'border-input'}`} />
                                  {errors[`delegates.${idx}.arrivalDateTime`] && <p className="text-xs text-red-500 mt-1">{errors[`delegates.${idx}.arrivalDateTime`]}</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-foreground mb-1">Departure Flight Number *</label>
                                  <input type="text" value={d.departureFlightNo || ''} onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    additionalDelegates: prev.additionalDelegates.map((item, i) => i === idx ? { ...item, departureFlightNo: e.target.value } : item)
                                  }))} className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors[`delegates.${idx}.departureFlightNo`] ? 'border-red-500' : 'border-input'}`} placeholder="e.g. EK501" />
                                  {errors[`delegates.${idx}.departureFlightNo`] && <p className="text-xs text-red-500 mt-1">{errors[`delegates.${idx}.departureFlightNo`]}</p>}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-foreground mb-1">Departure Date & Time *</label>
                                  <DatePicker selected={d.departureDateTime ? new Date(d.departureDateTime) : null} onChange={(date) => {
                                    if (!date) setFormData(prev => ({ ...prev, additionalDelegates: prev.additionalDelegates.map((item, i) => i === idx ? { ...item, departureDateTime: '' } : item) }));
                                    else {
                                      const dep = toDatetimeLocal(date);
                                      setFormData(prev => {
                                        const next = prev.additionalDelegates.map((item, i) => {
                                          if (i !== idx) return item;
                                          let arr = item.arrivalDateTime;
                                          if (arr && new Date(arr) <= new Date(dep)) arr = getDefaultArrivalTime(dep);
                                          return { ...item, departureDateTime: dep, arrivalDateTime: arr || item.arrivalDateTime };
                                        });
                                        return { ...prev, additionalDelegates: next };
                                      });
                                    }
                                  }} minDate={startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()} popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors[`delegates.${idx}.departureDateTime`] ? 'border-red-500' : 'border-input'}`} />
                                  {errors[`delegates.${idx}.departureDateTime`] && <p className="text-xs text-red-500 mt-1">{errors[`delegates.${idx}.departureDateTime`]}</p>}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </section>
                    )}
                    <p className="text-xs text-muted-foreground">Vendor will be assigned by admin.</p>
                  </div>
                ) : (
                  <>
                    {loadingCustomers ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-muted-foreground">Loading clients...</div>
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4">
                        <User size={48} className="text-muted-foreground mb-4" />
                        <h4 className="text-lg font-semibold text-foreground mb-2">No Clients Found</h4>
                        <p className="text-muted-foreground text-center mb-6 max-w-md">
                          You need to register a client in User Management before creating a transfer.
                        </p>
                        <button
                          type="button"
                          onClick={() => { onClose(); navigate('/user-management'); }}
                          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          <UserPlus size={16} /> Register a Client
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4">
                          <Dropdown
                            label="Select Client *"
                            name="customerId"
                            value={formData.customerId || ''}
                            onChange={handleChange}
                            options={[
                              { value: '', label: 'Select a client' },
                              ...customers.map(customer => {
                                const id = customer._id?.toString() || String(customer._id || '');
                                return {
                                  value: id,
                                  label: `${[customer.profile?.firstName, customer.profile?.lastName].filter(Boolean).join(' ').trim() || ''} - ${customer.email}`.trim() || customer.email
                                };
                              })
                            ]}
                            placeholder="Select a client"
                            minWidth="100%"
                          />
                          {errors.customerId && <span className="text-red-500 text-xs mt-1 block">{errors.customerId}</span>}
                        </div>
                        {formData.customerId && (
                          <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                            <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                              <User size={18} className="text-primary" /> Customer Details
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <span className="text-muted-foreground font-medium">Name:</span>
                                <span className={`font-semibold ${!formData.customerName ? 'text-red-500' : 'text-foreground'}`}>{formData.customerName || 'Not set'}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <span className="text-muted-foreground font-medium">Email:</span>
                                <span className={`font-semibold ${!formData.customerEmail ? 'text-red-500' : 'text-foreground'}`}>{formData.customerEmail || 'Not set'}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <span className="text-muted-foreground font-medium">Phone:</span>
                                <span className={`font-semibold ${!formData.customerPhone ? 'text-red-500' : 'text-foreground'}`}>{formData.customerPhone || 'Not set'}</span>
                              </div>
                            </div>
                            {(!formData.customerName || !formData.customerEmail || !formData.customerPhone) && (
                              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                                <span className="text-red-500 text-lg">⚠️</span>
                                <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                                  <strong>Missing Information:</strong> Ensure the customer profile is complete in User Management.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              </motion.div>
            )}

            {/* Step 2: Transfer Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
              <div>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Transfer Details</h3>
                  <p className="text-sm text-muted-foreground">Provide pickup, drop-off, and event information</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Pickup Location *
                    </label>
                    <input
                      type="text"
                      name="pickupLocation"
                      value={formData.pickupLocation}
                      onChange={handleChange}
                      placeholder="e.g., Mumbai Airport Terminal 2"
                      className={`w-full px-4 py-3.5 border rounded-xl text-sm bg-background text-foreground transition-all ${
                        errors.pickupLocation 
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-input focus:ring-2 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                    {errors.pickupLocation && <span className="text-red-500 text-xs mt-1.5 block font-medium">{errors.pickupLocation}</span>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Drop Location *
                    </label>
                    <input
                      type="text"
                      name="dropLocation"
                      value={formData.dropLocation}
                      onChange={handleChange}
                      placeholder="e.g., Grand Hyatt Hotel Mumbai"
                      className={`w-full px-4 py-3.5 border rounded-xl text-sm bg-background text-foreground transition-all ${
                        errors.dropLocation 
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-input focus:ring-2 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                    {errors.dropLocation && <span className="text-red-500 text-xs mt-1.5 block font-medium">{errors.dropLocation}</span>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Event Place *
                    </label>
                    <input
                      type="text"
                      name="eventPlace"
                      value={formData.eventPlace}
                      onChange={handleChange}
                      placeholder="e.g., Grand Hyatt Convention Center"
                      className={`w-full px-4 py-3.5 border rounded-xl text-sm bg-background text-foreground transition-all ${
                        errors.eventPlace 
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-input focus:ring-2 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                    {errors.eventPlace && <span className="text-red-500 text-xs mt-1.5 block font-medium">{errors.eventPlace}</span>}
                  </div>

                  {/* Include return transfer */}
                  <div className="pt-6 border-t border-border">
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.includeReturn}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeReturn: e.target.checked }))}
                        className="rounded border-input"
                      />
                      Include return transfer (round trip)
                    </label>
                  </div>
                  {formData.includeReturn && (
                    <div className="space-y-6 p-4 rounded-xl border border-border bg-muted/20">
                      <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Plane size={18} className="text-primary" />
                        Return flight & transfer
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return flight number *</label>
                          <input type="text" name="returnFlightNo" value={formData.returnFlightNo} onChange={handleChange} placeholder="e.g. EK502" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnFlightNo ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnFlightNo && <p className="text-xs text-red-500 mt-1">{errors.returnFlightNo}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return airline *</label>
                          <input type="text" name="returnAirline" value={formData.returnAirline} onChange={handleChange} placeholder="e.g. Emirates" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnAirline ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnAirline && <p className="text-xs text-red-500 mt-1">{errors.returnAirline}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return departure airport *</label>
                          <input type="text" name="returnDepartureAirport" value={formData.returnDepartureAirport} onChange={(e) => setFormData(prev => ({ ...prev, returnDepartureAirport: e.target.value.toUpperCase().slice(0, 3) }))} placeholder="e.g. BOM" maxLength={3} className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnDepartureAirport ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnDepartureAirport && <p className="text-xs text-red-500 mt-1">{errors.returnDepartureAirport}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return arrival airport *</label>
                          <input type="text" name="returnArrivalAirport" value={formData.returnArrivalAirport} onChange={(e) => setFormData(prev => ({ ...prev, returnArrivalAirport: e.target.value.toUpperCase().slice(0, 3) }))} placeholder="e.g. DXB" maxLength={3} className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnArrivalAirport ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnArrivalAirport && <p className="text-xs text-red-500 mt-1">{errors.returnArrivalAirport}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return departure date & time *</label>
                          <DatePicker selected={formData.returnDepartureDateTime ? new Date(formData.returnDepartureDateTime) : null} onChange={(date) => setFormData(prev => ({ ...prev, returnDepartureDateTime: date ? toDatetimeLocal(date) : '' }))} minDate={startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" filterTime={(time) => time.getTime() >= getMinTimeForFilter().getTime()} popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnDepartureDateTime ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnDepartureDateTime && <p className="text-xs text-red-500 mt-1">{errors.returnDepartureDateTime}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return arrival date & time *</label>
                          <DatePicker selected={formData.returnArrivalDateTime ? new Date(formData.returnArrivalDateTime) : null} onChange={(date) => setFormData(prev => ({ ...prev, returnArrivalDateTime: date ? toDatetimeLocal(date) : '' }))} minDate={formData.returnDepartureDateTime ? startOfDay(new Date(formData.returnDepartureDateTime)) : startOfDay(new Date())} showTimeSelect timeIntervals={15} dateFormat="dd MMM yyyy, HH:mm" placeholderText="Select" popperClassName="halo-datepicker-popper" calendarClassName="halo-datepicker-calendar" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnArrivalDateTime ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnArrivalDateTime && <p className="text-xs text-red-500 mt-1">{errors.returnArrivalDateTime}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-2">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return pickup location *</label>
                          <input type="text" name="returnPickupLocation" value={formData.returnPickupLocation} onChange={handleChange} placeholder="e.g., Hotel" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnPickupLocation ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnPickupLocation && <p className="text-xs text-red-500 mt-1">{errors.returnPickupLocation}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return drop location *</label>
                          <input type="text" name="returnDropLocation" value={formData.returnDropLocation} onChange={handleChange} placeholder="e.g., Airport" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnDropLocation ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnDropLocation && <p className="text-xs text-red-500 mt-1">{errors.returnDropLocation}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Return event place *</label>
                          <input type="text" name="returnEventPlace" value={formData.returnEventPlace} onChange={handleChange} placeholder="e.g., Airport departure" className={`w-full px-4 py-2.5 border rounded-lg bg-background text-foreground ${errors.returnEventPlace ? 'border-red-500' : 'border-input'}`} />
                          {errors.returnEventPlace && <p className="text-xs text-red-500 mt-1">{errors.returnEventPlace}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </motion.div>
            )}

            {/* Step 3: Vendor Details */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
              <div>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Assign Vendor (Optional)</h3>
                  <p className="text-sm text-muted-foreground">You can select a vendor here or assign one later from the transfer list.</p>
                </div>
                {loadingVendors ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-muted-foreground">Loading vendors...</div>
                  </div>
                ) : vendors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Building2 size={48} className="text-muted-foreground mb-4" />
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Vendors Yet</h4>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      You can create the transfer without a vendor and assign one later from the Transfers list. Use the &quot;Create Transfer&quot; button below.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <Dropdown
                        label="Select Vendor *"
                        name="vendorId"
                        value={formData.vendorId?.toString() || formData.vendorId || ''}
                        onChange={handleChange}
                        options={[
                          { value: '', label: 'Select a vendor' },
                          ...vendors.map(vendor => {
                            const vendorName = vendor.vendorDetails?.companyName || vendor.companyName || 'Unknown';
                            const statusLabel = vendor.status ? ` (${vendor.status})` : '';
                            return {
                              value: String(vendor._id || vendor._id?.toString() || ''),
                              label: `${vendorName}${statusLabel}`
                            };
                          })
                        ]}
                        placeholder="Select a vendor"
                        minWidth="100%"
                      />
                      {errors.vendorId && <span className="text-red-500 text-xs mt-1 block">{errors.vendorId}</span>}
                    </div>

                    {/* Show populated vendor details */}
                    {formData.vendorId && (
                      <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                        <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                          <Building2 size={18} className="text-primary" />
                          Vendor Details
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground font-medium">Company:</span>
                            <span className="font-semibold text-foreground">
                              {formData.vendorName || 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground font-medium">Contact Person:</span>
                            <span className="font-semibold text-foreground">
                              {formData.vendorContact || 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground font-medium">Email:</span>
                            <span className="font-semibold text-foreground">
                              {formData.vendorEmail || 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground font-medium">Phone:</span>
                            <span className="font-semibold text-foreground">
                              {formData.vendorPhone || 'Not set'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
                          <span className="text-blue-500 text-lg">ℹ️</span>
                          <div className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                            <strong>Note:</strong> Driver assignment is optional. The vendor can assign a driver after the transfer is created.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </motion.div>
            )}
            </AnimatePresence>
            </div>

            {/* Navigation Buttons - Fixed at bottom with professional styling */}
            <div className="flex-shrink-0 border-t border-border bg-muted/30 backdrop-blur-sm mt-auto">
              <div className="flex gap-4 justify-between items-center px-8 py-6">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-6 py-3 border-2 border-border rounded-lg text-sm font-semibold text-foreground bg-background hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 flex items-center gap-2 shadow-sm"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 border-2 border-border rounded-lg text-sm font-semibold text-muted-foreground bg-background hover:bg-muted hover:text-foreground hover:border-border transition-all duration-200 shadow-sm"
                  >
                    Cancel
                  </button>
                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
                    >
                      Next Step
                      <ChevronRight size={18} strokeWidth={3} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-8 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                        loading 
                          ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                          : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 hover:scale-[1.02]'
                      }`}
                    >
                      <Save size={18} />
                      {loading ? 'Creating Transfer...' : 'Create Transfer'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Drawer>
  );
};

export default TransferForm;
