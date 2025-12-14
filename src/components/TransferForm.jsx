import { useState, useEffect } from 'react';
import { Save, Plane, User, MapPin, Truck, Calendar, Users as UsersIcon, Car, Plus, XCircle, ChevronRight, ChevronLeft, CheckCircle2, UserPlus, Building2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Drawer from './Drawer';
import Dropdown from './Dropdown';
import { motion, AnimatePresence } from 'framer-motion';

const TransferForm = ({ onClose, onSuccess }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdTransferId, setCreatedTransferId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    // Customer - Selected from dropdown
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    
    // Transfer Details
    pickupLocation: '',
    dropLocation: '',
    eventPlace: '',
    
    // Vendor - Selected from dropdown
    vendorId: '',
    vendorName: '',
    vendorContact: '',
    vendorPhone: '',
    vendorEmail: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const totalSteps = 3;

  useEffect(() => {
    fetchCustomers();
    fetchVendors();
  }, []);

  // Clear ALL errors whenever step changes (when user navigates between steps)
  useEffect(() => {
    setErrors({});
  }, [currentStep]);

  useEffect(() => {
    if (formData.vendorId && vendors.length > 0) {
      fetchVendorDetails(formData.vendorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.vendorId]);
  
  // Separate effect to handle vendor details when vendors array changes
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

  // Step validation functions - return errors without setting state
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.customerId) newErrors.customerId = 'Please select a client';
    if (!formData.customerName.trim()) newErrors.customerName = 'Client name is required';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    }
    // Phone validation - allow international format or regular format
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Phone is required';
    } else {
      const phone = formData.customerPhone.trim();
      // Accept both international format (+1234567890) and regular format (1234567890)
      const isValidInternational = /^\+[1-9]\d{1,14}$/.test(phone);
      const isValidRegular = /^\d{10,15}$/.test(phone);
      if (!isValidInternational && !isValidRegular) {
        newErrors.customerPhone = 'Phone must be valid (e.g., +1234567890 or 1234567890)';
      }
    }
    
    console.log('Step 1 validation:', { formData, newErrors });
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.pickupLocation.trim()) newErrors.pickupLocation = 'Pickup location is required';
    if (!formData.dropLocation.trim()) newErrors.dropLocation = 'Drop location is required';
    if (!formData.eventPlace.trim()) newErrors.eventPlace = 'Event place is required';
    return newErrors;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.vendorId) {
      newErrors.vendorId = 'Please select a vendor';
    }
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
      // Generate transfer ID (APX + 6 digits) - ensure always 6 digits
      const randomNum = Math.floor(Math.random() * 900000) + 100000; // 100000 to 999999
      const transferId = 'APX' + randomNum.toString().padStart(6, '0'); // Ensure exactly 6 digits

      // Find the selected vendor to get vendorId string
      // For User model vendors, vendorId might be in vendorDetails or at root level
      const selectedVendor = vendors.find(v => v._id === formData.vendorId || v.vendorId === formData.vendorId);
      // Use the MongoDB _id (24 characters) for vendor_id in vendor_details
      const vendorIdString = selectedVendor?._id?.toString() || formData.vendorId;

      // Prepare transfer data (simplified initial form - flight details, passengers, luggage will be added later)
      const transferData = {
        _id: transferId,
        customer_id: formData.customerId,
        customer_details: {
          name: formData.customerName,
          email: formData.customerEmail,
          contact_number: formData.customerPhone,
          no_of_passengers: 1, // Default value - will be updated later
          luggage_count: 0 // Default value - will be updated later
        },
        // Flight details - placeholder values that pass validation, will be updated later
        flight_details: {
          flight_no: 'XX000', // Placeholder in valid format - will be updated later
          airline: 'TBD',
          departure_airport: 'TBD',
          arrival_airport: 'TBD',
          departure_time: new Date().toISOString(),
          arrival_time: new Date().toISOString(),
          status: 'on_time', // Default status - will be updated when flight details are added
          delay_minutes: 0
        },
        transfer_details: {
          pickup_location: formData.pickupLocation,
          drop_location: formData.dropLocation,
          event_place: formData.eventPlace,
          estimated_pickup_time: new Date().toISOString(), // Will be updated when flight details are added
          special_notes: '' // Will be added later if needed
        },
        vendor_id: formData.vendorId,
        vendor_details: {
          vendor_id: vendorIdString,
          vendor_name: formData.vendorName,
          contact_person: formData.vendorContact,
          contact_number: formData.vendorPhone,
          email: formData.vendorEmail
        }
      };

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
        setCreatedTransferId(transferId);
        // Don't close immediately - show success step with APEX ID
      } else {
        toast.error(data.message || 'Failed to create transfer');
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
            Your transfer has been successfully created. Use the APEX ID below to track your transfer.
          </p>
          <div className="bg-card border-2 border-primary rounded-lg p-6 mb-6 w-full max-w-md">
            <div className="text-sm text-muted-foreground mb-2">Your APEX ID:</div>
            <div className="flex items-center justify-center gap-3">
              <div className="text-3xl font-mono font-bold text-primary text-center">
                {createdTransferId}
              </div>
              <motion.button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdTransferId);
                  setCopied(true);
                  toast.success('APEX ID copied to clipboard!');
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
                  vendorEmail: ''
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

  const steps = [
    { number: 1, title: 'Select Client', icon: User },
    { number: 2, title: 'Transfer Details', icon: MapPin },
    { number: 3, title: 'Vendor Details', icon: Truck }
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
            {/* Step 1: Select Client */}
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
                  <h3 className="text-2xl font-bold text-foreground mb-2">Select Client</h3>
                  <p className="text-sm text-muted-foreground">Choose the client for this transfer</p>
                </div>
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
                      onClick={() => {
                        onClose();
                        navigate('/user-management');
                      }}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <UserPlus size={16} />
                      Register a Client
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
                            const id = customer._id?.toString() || String(customer._id || '')
                            return {
                              value: id,
                              label: `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() + ' - ' + customer.email
                            }
                          })
                        ]}
                        placeholder="Select a client"
                        minWidth="100%"
                      />
                      {errors.customerId && <span className="text-red-500 text-xs mt-1 block">{errors.customerId}</span>}
                    </div>
                    
                    {/* Show populated customer details */}
                    {formData.customerId && (
                      <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                        <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                          <User size={18} className="text-primary" />
                          Customer Details
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground font-medium">Name:</span>
                            <span className={`font-semibold ${!formData.customerName ? 'text-red-500' : 'text-foreground'}`}>
                              {formData.customerName || 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground font-medium">Email:</span>
                            <span className={`font-semibold ${!formData.customerEmail ? 'text-red-500' : 'text-foreground'}`}>
                              {formData.customerEmail || 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground font-medium">Phone:</span>
                            <span className={`font-semibold ${!formData.customerPhone ? 'text-red-500' : 'text-foreground'}`}>
                              {formData.customerPhone || 'Not set'}
                            </span>
                          </div>
                        </div>
                        {(!formData.customerName || !formData.customerEmail || !formData.customerPhone) && (
                          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                            <span className="text-red-500 text-lg">⚠️</span>
                            <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                              <strong>Missing Information:</strong> Some required customer information is missing. Please ensure the customer profile is complete in User Management.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                  <h3 className="text-2xl font-bold text-foreground mb-2">Select Vendor</h3>
                  <p className="text-sm text-muted-foreground">Choose the vendor and assign driver (optional)</p>
                </div>
                {loadingVendors ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-muted-foreground">Loading vendors...</div>
                  </div>
                ) : vendors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Building2 size={48} className="text-muted-foreground mb-4" />
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Vendors Found</h4>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      You need to register a vendor in User Management before creating a transfer.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/user-management');
                      }}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <UserPlus size={16} />
                      Register a Vendor
                    </button>
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
                            <strong>Driver Assignment:</strong> The vendor can assign a driver after logging in to their portal.
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
