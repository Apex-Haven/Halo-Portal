import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Truck, Clock, CheckCircle, Download, FileText, Calendar, X, User, Building2, Search, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { vendorService } from '../services/vendorService'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'

const Reports = () => {
  const { user, isRole } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [reports, setReports] = useState(null)
  const [customers, setCustomers] = useState([])
  const [vendors, setVendors] = useState([])
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState('')
  const [transferSearchTerm, setTransferSearchTerm] = useState('')
  const [showTransferDropdown, setShowTransferDropdown] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState('')
  const [vendorSearchTerm, setVendorSearchTerm] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)

  // Check if user is admin or super admin
  useEffect(() => {
    if (user && !isRole('SUPER_ADMIN') && !isRole('ADMIN')) {
      // Redirect non-admin users to transfers page
      navigate('/transfers', { replace: true })
      return
    }
  }, [user, isRole, navigate])

  useEffect(() => {
    // Only fetch data if user is admin
    if (user && (isRole('SUPER_ADMIN') || isRole('ADMIN'))) {
    fetchAllData()
    }
    
    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.customer-dropdown-container')) {
        setShowCustomerDropdown(false)
      }
      if (!event.target.closest('.transfer-dropdown-container')) {
        setShowTransferDropdown(false)
      }
      if (!event.target.closest('.vendor-dropdown-container')) {
        setShowVendorDropdown(false)
      }
    }
    
    if (showCustomerDropdown || showTransferDropdown || showVendorDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCustomerDropdown, showTransferDropdown, showVendorDropdown])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }

      // Fetch all data in parallel
      // Note: API limit is 100, so we fetch multiple pages if needed
      const [transfersRes, customersRes, vendorsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/transfers?limit=100`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API_BASE_URL}/users/customers`, { headers }).catch(() => ({ ok: false })),
        vendorService.getAllVendors().catch(() => ({ success: false }))
      ])

      // Process transfers
      let transfersData = []
      if (transfersRes.ok) {
        const transfersJson = await transfersRes.json()
        if (transfersJson.success && transfersJson.data) {
          transfersData = transfersJson.data
        }
      }

      // Process customers
      let customersData = []
      if (customersRes.ok) {
        const customersJson = await customersRes.json()
        customersData = customersJson.customers || []
      }

      // Process vendors
      let vendorsData = []
      if (vendorsRes.success) {
        vendorsData = vendorsRes.vendors || []
      }

      setTransfers(transfersData)
      setCustomers(customersData)
      setVendors(vendorsData)

      // Calculate metrics
      const totalTransfers = transfersData.length
      const completedTransfers = transfersData.filter(t => 
        (t.transfer_details?.transfer_status || t.transfer_details?.status || '').toLowerCase() === 'completed'
      ).length
      const pendingTransfers = transfersData.filter(t => 
        (t.transfer_details?.transfer_status || t.transfer_details?.status || '').toLowerCase() === 'pending'
      ).length
      const inProgressTransfers = transfersData.filter(t => 
        (t.transfer_details?.transfer_status || t.transfer_details?.status || '').toLowerCase() === 'in_progress' ||
        (t.transfer_details?.transfer_status || t.transfer_details?.status || '').toLowerCase() === 'enroute'
      ).length
      const cancelledTransfers = transfersData.filter(t => 
        (t.transfer_details?.transfer_status || t.transfer_details?.status || '').toLowerCase() === 'cancelled'
      ).length

      // Calculate success rate
      const successRate = totalTransfers > 0 
        ? ((completedTransfers / totalTransfers) * 100).toFixed(1)
        : 0

      // Calculate average completion time (simplified - would need actual timestamps)
      const completedWithTimestamps = transfersData.filter(t => 
        (t.transfer_details?.transfer_status || t.transfer_details?.status || '').toLowerCase() === 'completed' &&
        t.createdAt && t.updatedAt
      )
      
      let avgCompletionTime = 'N/A'
      if (completedWithTimestamps.length > 0) {
        const totalTime = completedWithTimestamps.reduce((sum, t) => {
          const created = new Date(t.createdAt)
          const updated = new Date(t.updatedAt)
          return sum + (updated - created)
        }, 0)
        const avgMs = totalTime / completedWithTimestamps.length
        const avgHours = (avgMs / (1000 * 60 * 60)).toFixed(1)
        avgCompletionTime = `${avgHours} hours`
      }

      // Get top vendor
      const vendorCounts = {}
      transfersData.forEach(t => {
        const vendorId = t.vendor_details?.vendor_id || t.vendor_id
        if (vendorId) {
          vendorCounts[vendorId] = (vendorCounts[vendorId] || 0) + 1
        }
      })
      const sortedVendors = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])
      const topVendorId = sortedVendors[0]?.[0] || null
      const topVendorName = topVendorId 
        ? (transfersData.find(t => (t.vendor_details?.vendor_id || t.vendor_id) === topVendorId)?.vendor_details?.vendor_name || topVendorId)
        : 'N/A'

      // Calculate monthly growth (simplified)
      const thisMonth = new Date().getMonth()
      const thisMonthTransfers = transfersData.filter(t => {
        const date = new Date(t.createdAt || Date.now())
        return date.getMonth() === thisMonth
      }).length
      
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
      const lastMonthTransfers = transfersData.filter(t => {
        const date = new Date(t.createdAt || Date.now())
        return date.getMonth() === lastMonth
      }).length

      const monthlyGrowth = lastMonthTransfers > 0
        ? (((thisMonthTransfers - lastMonthTransfers) / lastMonthTransfers) * 100).toFixed(1)
        : thisMonthTransfers > 0 ? '100.0' : '0.0'

      setReports({
        totalTransfers,
        completedTransfers,
        pendingTransfers,
        inProgressTransfers,
        cancelledTransfers,
        averageCompletionTime: avgCompletionTime,
        topVendor: topVendorName,
        successRate: parseFloat(successRate),
        monthlyGrowth: parseFloat(monthlyGrowth),
        totalCustomers: customersData.length,
        totalVendors: vendorsData.length,
        activeVendors: vendorsData.filter(v => (v.status || '').toLowerCase() === 'active').length
      })
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Failed to load reports data')
    } finally {
      setLoading(false)
    }
  }

  const exportTransfersToPDF = async () => {
    if (!transfers || transfers.length === 0) {
      toast.error('No transfers data to export')
      return
    }

    setExportLoading(true)
    try {
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(37, 99, 235)
      doc.text('Transfers Report', 14, 20)
      
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
      doc.text(`Total Transfers: ${transfers.length}`, 14, 37)

      // Table data
      const tableData = transfers.map(transfer => [
        (transfer._id || '').substring(0, 12) + '...',
        transfer.customer_details?.name || 'N/A',
        transfer.customer_details?.email || 'N/A',
        transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || 'N/A',
        transfer.vendor_details?.vendor_name || transfer.vendor_details?.vendor_id || 'N/A',
        (transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'Pending').replace('_', ' ')
      ])

      autoTable(doc, {
        head: [['Transfer ID', 'Customer', 'Email', 'Flight', 'Vendor', 'Status']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
      })

      doc.save(`transfers-report-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Transfers report exported to PDF!')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    } finally {
      setExportLoading(false)
    }
  }

  const exportCustomersToPDF = async () => {
    if (!customers || customers.length === 0) {
      toast.error('No customers data to export')
      return
    }

    setExportLoading(true)
    try {
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(37, 99, 235)
      doc.text('Customers Report', 14, 20)
      
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
      doc.text(`Total Customers: ${customers.length}`, 14, 37)

      // Table data
      const tableData = customers.map(customer => [
        customer.username || 'N/A',
        `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() || 'N/A',
        customer.email || 'N/A',
        customer.profile?.phone || 'N/A',
        customer.role || 'TRAVELER'
      ])

      autoTable(doc, {
        head: [['Username', 'Name', 'Email', 'Phone', 'Role']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] }
      })

      doc.save(`customers-report-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Customers report exported to PDF!')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    } finally {
      setExportLoading(false)
    }
  }

  const exportIndividualPersonPDF = async (customer) => {
    if (!customer) {
      toast.error('No customer data to export')
      return
    }

    setExportLoading(true)
    try {
      const doc = new jsPDF()
      let yPosition = 20
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(37, 99, 235)
      const customerName = `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() || customer.username || 'Customer'
      doc.text(`${customerName} - Customer Report`, 14, yPosition)
      
      yPosition += 10
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, yPosition)
      yPosition += 15

      // Personal Information
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Personal Information', 14, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Name:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customerName, 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Username:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customer.username || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Email:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customer.email || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Phone:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customer.profile?.phone || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Role:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customer.role || 'CUSTOMER', 50, yPosition)
      yPosition += 10

      // Account Status
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Account Status', 14, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Status:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customer.isActive !== false ? 'Active' : 'Inactive', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Email Verified:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customer.isEmailVerified ? 'Yes' : 'No', 50, yPosition)
      yPosition += 6

      if (customer.lastLogin) {
        doc.setFont(undefined, 'bold')
        doc.text('Last Login:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(new Date(customer.lastLogin).toLocaleString(), 50, yPosition)
        yPosition += 6
      }

      doc.setFont(undefined, 'bold')
      doc.text('Account Created:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(customer.createdAt ? new Date(customer.createdAt).toLocaleString() : 'N/A', 50, yPosition)
      yPosition += 10

      // Transfer History (if available)
      const customerTransfers = transfers.filter(t => 
        t.customer_details?.email === customer.email || 
        t.customer_id === customer._id
      )

      if (customerTransfers.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(37, 99, 235)
        doc.text(`Transfer History (${customerTransfers.length})`, 14, yPosition)
        yPosition += 8

        const transferData = customerTransfers.slice(0, 20).map(transfer => [
          (transfer._id || '').substring(0, 12) + '...',
          transfer.flight_details?.flight_no || 'N/A',
          transfer.vendor_details?.vendor_name || 'N/A',
          (transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'Pending').replace('_', ' '),
          transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : 'N/A'
        ])

        autoTable(doc, {
          head: [['Transfer ID', 'Flight', 'Vendor', 'Status', 'Created Date']],
          body: transferData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235] }
        })
      }

      const filename = `customer-${customer.username || customer._id || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      toast.success(`Customer report for ${customerName} exported!`)
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export customer PDF')
    } finally {
      setExportLoading(false)
    }
  }

  const exportIndividualPersonCSV = (customer) => {
    if (!customer) {
      toast.error('No customer data to export')
      return
    }

    setExportLoading(true)
    try {
      const customerName = `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() || customer.username || 'Customer'
      
      // Get customer's transfers
      const customerTransfers = transfers.filter(t => 
        t.customer_details?.email === customer.email || 
        t.customer_id === customer._id
      )

      // Create CSV content
      const headers = [
        'Field', 'Value'
      ]

      const personalData = [
        ['Name', customerName],
        ['Username', customer.username || ''],
        ['Email', customer.email || ''],
        ['Phone', customer.profile?.phone || ''],
        ['Role', customer.role || 'CUSTOMER'],
        ['Status', customer.isActive !== false ? 'Active' : 'Inactive'],
        ['Email Verified', customer.isEmailVerified ? 'Yes' : 'No'],
        ['Last Login', customer.lastLogin ? new Date(customer.lastLogin).toISOString() : ''],
        ['Account Created', customer.createdAt ? new Date(customer.createdAt).toISOString() : ''],
        ['Total Transfers', customerTransfers.length]
      ]

      // Add transfer details
      const transferRows = customerTransfers.map((transfer, index) => [
        `Transfer ${index + 1}`,
        `ID: ${transfer._id || ''}, Flight: ${transfer.flight_details?.flight_no || 'N/A'}, Status: ${transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'Pending'}`
      ])

      const csvContent = [
        headers.join(','),
        ...personalData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ...transferRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `customer-${customer.username || customer._id || 'report'}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Customer report for ${customerName} exported!`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export customer report')
    } finally {
      setExportLoading(false)
    }
  }

  const exportIndividualTransferPDF = async (transfer) => {
    if (!transfer) {
      toast.error('No transfer data to export')
      return
    }

    setExportLoading(true)
    try {
      const doc = new jsPDF()
      let yPosition = 20
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(37, 99, 235)
      const transferId = (transfer._id || '').substring(0, 12) || 'Transfer'
      doc.text(`Transfer Report - ${transferId}`, 14, yPosition)
      
      yPosition += 10
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, yPosition)
      yPosition += 15

      // Customer Information
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Customer Information', 14, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Name:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.customer_details?.name || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Email:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.customer_details?.email || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Phone:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.customer_details?.phone || 'N/A', 50, yPosition)
      yPosition += 10

      // Flight Information
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Flight Information', 14, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Flight Number:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Airline:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.flight_details?.airline || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Arrival Airport:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.flight_details?.arrival_airport || transfer.flight_details?.arrivalAirport || 'N/A', 50, yPosition)
      yPosition += 6

      if (transfer.flight_details?.arrival_date) {
        doc.setFont(undefined, 'bold')
        doc.text('Arrival Date:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(new Date(transfer.flight_details.arrival_date).toLocaleString(), 50, yPosition)
        yPosition += 6
      }
      yPosition += 4

      // Transfer Details
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Transfer Details', 14, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Status:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text((transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'Pending').replace('_', ' '), 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Vendor:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.vendor_details?.vendor_name || transfer.vendor_details?.vendor_id || 'N/A', 50, yPosition)
      yPosition += 6

      if (transfer.assigned_driver_details?.driver_name || transfer.assigned_driver_details?.name) {
        doc.setFont(undefined, 'bold')
        doc.text('Driver:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(transfer.assigned_driver_details?.driver_name || transfer.assigned_driver_details?.name || 'N/A', 50, yPosition)
        yPosition += 6
      }

      if (transfer.transfer_details?.pickup_location) {
        doc.setFont(undefined, 'bold')
        doc.text('Pickup Location:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(transfer.transfer_details.pickup_location, 50, yPosition)
        yPosition += 6
      }

      if (transfer.transfer_details?.drop_location) {
        doc.setFont(undefined, 'bold')
        doc.text('Drop Location:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(transfer.transfer_details.drop_location, 50, yPosition)
        yPosition += 6
      }

      doc.setFont(undefined, 'bold')
      doc.text('Created Date:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : 'N/A', 50, yPosition)
      yPosition += 6

      if (transfer.updatedAt) {
        doc.setFont(undefined, 'bold')
        doc.text('Last Updated:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(new Date(transfer.updatedAt).toLocaleString(), 50, yPosition)
      }

      const filename = `transfer-${transfer._id || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      toast.success('Transfer report exported!')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export transfer PDF')
    } finally {
      setExportLoading(false)
    }
  }

  const exportIndividualTransferCSV = (transfer) => {
    if (!transfer) {
      toast.error('No transfer data to export')
      return
    }

    setExportLoading(true)
    try {
      const headers = ['Field', 'Value']
      const transferData = [
        ['Transfer ID', transfer._id || ''],
        ['Customer Name', transfer.customer_details?.name || ''],
        ['Customer Email', transfer.customer_details?.email || ''],
        ['Customer Phone', transfer.customer_details?.phone || ''],
        ['Flight Number', transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || ''],
        ['Airline', transfer.flight_details?.airline || ''],
        ['Arrival Airport', transfer.flight_details?.arrival_airport || transfer.flight_details?.arrivalAirport || ''],
        ['Arrival Date', transfer.flight_details?.arrival_date ? new Date(transfer.flight_details.arrival_date).toISOString() : ''],
        ['Vendor', transfer.vendor_details?.vendor_name || transfer.vendor_details?.vendor_id || ''],
        ['Driver', transfer.assigned_driver_details?.driver_name || transfer.assigned_driver_details?.name || ''],
        ['Status', (transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'Pending').replace('_', ' ')],
        ['Pickup Location', transfer.transfer_details?.pickup_location || ''],
        ['Drop Location', transfer.transfer_details?.drop_location || ''],
        ['Created Date', transfer.createdAt ? new Date(transfer.createdAt).toISOString() : ''],
        ['Last Updated', transfer.updatedAt ? new Date(transfer.updatedAt).toISOString() : '']
      ]

      const csvContent = [
        headers.join(','),
        ...transferData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `transfer-${transfer._id || 'report'}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Transfer report exported!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export transfer report')
    } finally {
      setExportLoading(false)
    }
  }

  const exportIndividualVendorPDF = async (vendor) => {
    if (!vendor) {
      toast.error('No vendor data to export')
      return
    }

    setExportLoading(true)
    try {
      const doc = new jsPDF()
      let yPosition = 20
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(37, 99, 235)
      const vendorName = vendor.companyName || vendor.name || 'Vendor'
      doc.text(`${vendorName} - Vendor Report`, 14, yPosition)
      
      yPosition += 10
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, yPosition)
      yPosition += 15

      // Contact Information
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Contact Information', 14, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const contactName = vendor.contactPerson 
        ? `${vendor.contactPerson.firstName || ''} ${vendor.contactPerson.lastName || ''}`.trim()
        : 'N/A'
      doc.setFont(undefined, 'bold')
      doc.text('Contact Person:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(contactName, 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Email:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(vendor.contactPerson?.email || vendor.email || 'N/A', 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Phone:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(vendor.contactPerson?.phone || vendor.phone || 'N/A', 50, yPosition)
      yPosition += 10

      // Business Details
      if (vendor.businessDetails) {
        doc.setFontSize(14)
        doc.setTextColor(37, 99, 235)
        doc.text('Business Details', 14, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold')
        doc.text('License Number:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(vendor.businessDetails.licenseNumber || 'N/A', 50, yPosition)
        yPosition += 6

        doc.setFont(undefined, 'bold')
        doc.text('Tax ID:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(vendor.businessDetails.taxId || 'N/A', 50, yPosition)
        yPosition += 6

        if (vendor.businessDetails.website) {
          doc.setFont(undefined, 'bold')
          doc.text('Website:', 14, yPosition)
          doc.setFont(undefined, 'normal')
          doc.text(vendor.businessDetails.website, 50, yPosition)
          yPosition += 6
        }

        if (vendor.businessDetails.address) {
          const addr = vendor.businessDetails.address
          doc.setFont(undefined, 'bold')
          doc.text('Address:', 14, yPosition)
          doc.setFont(undefined, 'normal')
          doc.text(`${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}, ${addr.country || ''}`, 50, yPosition)
          yPosition += 8
        } else {
          yPosition += 4
        }
      }

      // Pricing
      if (vendor.pricing) {
        doc.setFontSize(14)
        doc.setTextColor(37, 99, 235)
        doc.text('Pricing', 14, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold')
        doc.text('Base Rate:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(`${vendor.pricing.currency || 'USD'} ${vendor.pricing.baseRate || 0}`, 50, yPosition)
        yPosition += 6

        if (vendor.pricing.perKmRate) {
          doc.setFont(undefined, 'bold')
          doc.text('Per KM:', 14, yPosition)
          doc.setFont(undefined, 'normal')
          doc.text(`${vendor.pricing.currency || 'USD'} ${vendor.pricing.perKmRate}`, 50, yPosition)
          yPosition += 6
        }

        if (vendor.pricing.waitingTimeRate) {
          doc.setFont(undefined, 'bold')
          doc.text('Waiting Time Rate:', 14, yPosition)
          doc.setFont(undefined, 'normal')
          doc.text(`${vendor.pricing.currency || 'USD'} ${vendor.pricing.waitingTimeRate}`, 50, yPosition)
          yPosition += 6
        }

        if (vendor.pricing.nightSurcharge) {
          doc.setFont(undefined, 'bold')
          doc.text('Night Surcharge:', 14, yPosition)
          doc.setFont(undefined, 'normal')
          doc.text(`${vendor.pricing.currency || 'USD'} ${vendor.pricing.nightSurcharge}`, 50, yPosition)
          yPosition += 6
        }
        yPosition += 4
      }

      // Performance Metrics
      if (vendor.performance) {
        doc.setFontSize(14)
        doc.setTextColor(37, 99, 235)
        doc.text('Performance Metrics', 14, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold')
        doc.text('Rating:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(`${(vendor.performance.rating || 0).toFixed(1)}/5.0`, 50, yPosition)
        yPosition += 6

        doc.setFont(undefined, 'bold')
        doc.text('Total Bookings:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(String(vendor.performance.totalBookings || 0), 50, yPosition)
        yPosition += 6

        doc.setFont(undefined, 'bold')
        doc.text('Completed:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(String(vendor.performance.completedBookings || 0), 50, yPosition)
        yPosition += 6

        doc.setFont(undefined, 'bold')
        doc.text('Cancelled:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(String(vendor.performance.cancelledBookings || 0), 50, yPosition)
        yPosition += 6

        const completionRate = vendor.performance.totalBookings > 0
          ? ((vendor.performance.completedBookings / vendor.performance.totalBookings) * 100).toFixed(1)
          : '0.0'
        doc.setFont(undefined, 'bold')
        doc.text('Completion Rate:', 14, yPosition)
        doc.setFont(undefined, 'normal')
        doc.text(`${completionRate}%`, 50, yPosition)
        yPosition += 6

        if (vendor.performance.averageResponseTime) {
          doc.setFont(undefined, 'bold')
          doc.text('Avg Response Time:', 14, yPosition)
          doc.setFont(undefined, 'normal')
          doc.text(`${vendor.performance.averageResponseTime} minutes`, 50, yPosition)
          yPosition += 6
        }
        yPosition += 4
      }

      // Status
      doc.setFontSize(14)
      doc.setTextColor(37, 99, 235)
      doc.text('Status', 14, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Status:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text((vendor.status || 'pending').replace('_', ' '), 50, yPosition)
      yPosition += 6

      doc.setFont(undefined, 'bold')
      doc.text('Vendor ID:', 14, yPosition)
      doc.setFont(undefined, 'normal')
      doc.text(vendor.vendorId || vendor._id || 'N/A', 50, yPosition)

      const filename = `vendor-${vendor.vendorId || vendor._id || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      toast.success(`Vendor report for ${vendorName} exported!`)
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export vendor PDF')
    } finally {
      setExportLoading(false)
    }
  }

  const exportIndividualVendorCSV = (vendor) => {
    if (!vendor) {
      toast.error('No vendor data to export')
      return
    }

    setExportLoading(true)
    try {
      const vendorName = vendor.companyName || vendor.name || 'Vendor'
      const contactName = vendor.contactPerson 
        ? `${vendor.contactPerson.firstName || ''} ${vendor.contactPerson.lastName || ''}`.trim()
        : ''
      const address = vendor.businessDetails?.address
        ? `${vendor.businessDetails.address.street || ''}, ${vendor.businessDetails.address.city || ''}, ${vendor.businessDetails.address.state || ''} ${vendor.businessDetails.address.zipCode || ''}, ${vendor.businessDetails.address.country || ''}`
        : ''
      const completionRate = vendor.performance?.totalBookings > 0
        ? ((vendor.performance.completedBookings / vendor.performance.totalBookings) * 100).toFixed(1)
        : '0.0'
      
      const headers = ['Field', 'Value']
      const vendorData = [
        ['Company Name', vendorName],
        ['Vendor ID', vendor.vendorId || vendor._id || ''],
        ['Contact Person', contactName],
        ['Email', vendor.contactPerson?.email || vendor.email || ''],
        ['Phone', vendor.contactPerson?.phone || vendor.phone || ''],
        ['License Number', vendor.businessDetails?.licenseNumber || ''],
        ['Tax ID', vendor.businessDetails?.taxId || ''],
        ['Address', address],
        ['Website', vendor.businessDetails?.website || ''],
        ['Status', vendor.status || 'pending'],
        ['Rating', (vendor.performance?.rating || vendor.rating || 0).toFixed(1)],
        ['Total Bookings', vendor.performance?.totalBookings || 0],
        ['Completed Bookings', vendor.performance?.completedBookings || 0],
        ['Cancelled Bookings', vendor.performance?.cancelledBookings || 0],
        ['Completion Rate', completionRate + '%'],
        ['Base Rate', vendor.pricing?.baseRate || 0],
        ['Currency', vendor.pricing?.currency || 'USD'],
        ['Per KM Rate', vendor.pricing?.perKmRate || 0],
        ['Waiting Time Rate', vendor.pricing?.waitingTimeRate || 0],
        ['Night Surcharge', vendor.pricing?.nightSurcharge || 0],
        ['Notes', vendor.notes || '']
      ]

      const csvContent = [
        headers.join(','),
        ...vendorData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `vendor-${vendor.vendorId || vendor._id || 'report'}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Vendor report for ${vendorName} exported!`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export vendor report')
    } finally {
      setExportLoading(false)
    }
  }

  const exportVendorsToPDF = async () => {
    if (!vendors || vendors.length === 0) {
      toast.error('No vendors data to export')
      return
    }

    setExportLoading(true)
    try {
      const doc = new jsPDF()
      let yPosition = 20
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(37, 99, 235)
      doc.text('Vendors Detailed Report', 14, yPosition)
      
      yPosition += 10
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, yPosition)
      yPosition += 7
      doc.text(`Total Vendors: ${vendors.length}`, 14, yPosition)
      yPosition += 15

      // Summary table with key details
      const summaryData = vendors.map(vendor => {
        const contactName = vendor.contactPerson 
          ? `${vendor.contactPerson.firstName || ''} ${vendor.contactPerson.lastName || ''}`.trim()
          : 'N/A'
        const address = vendor.businessDetails?.address
          ? `${vendor.businessDetails.address.street || ''}, ${vendor.businessDetails.address.city || ''}, ${vendor.businessDetails.address.state || ''} ${vendor.businessDetails.address.zipCode || ''}`
          : 'N/A'
        
        const completionRate = vendor.performance?.totalBookings > 0
          ? ((vendor.performance.completedBookings / vendor.performance.totalBookings) * 100).toFixed(1)
          : '0.0'
        
        const vehicleTypes = vendor.services?.airportTransfers?.vehicleTypes?.join(', ') || 'N/A'
        
        return [
          vendor.companyName || vendor.name || 'N/A',
          vendor.vendorId || vendor._id || 'N/A',
          contactName,
          vendor.contactPerson?.email || vendor.email || 'N/A',
          vendor.contactPerson?.phone || vendor.phone || 'N/A',
          (vendor.status || 'pending').replace('_', ' '),
          (vendor.performance?.rating || vendor.rating || 0).toFixed(1),
          vendor.performance?.totalBookings || 0,
          completionRate + '%'
        ]
      })

      autoTable(doc, {
        head: [['Company', 'Vendor ID', 'Contact Person', 'Email', 'Phone', 'Status', 'Rating', 'Total Bookings', 'Completion %']],
        body: summaryData,
        startY: yPosition,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 15 },
          7: { cellWidth: 20 },
          8: { cellWidth: 20 }
        }
      })

      // Add new page for detailed information
      vendors.forEach((vendor, index) => {
        if (index > 0 && index % 3 === 0) {
          doc.addPage()
          yPosition = 20
        } else {
          yPosition = (doc.lastAutoTable.finalY || 100) + 15
        }

        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(14)
        doc.setTextColor(37, 99, 235)
        doc.text(`${vendor.companyName || vendor.name || 'N/A'} (${vendor.vendorId || vendor._id || 'N/A'})`, 14, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        
        // Contact Information
        doc.setFont(undefined, 'bold')
        doc.text('Contact Information:', 14, yPosition)
        yPosition += 6
        doc.setFont(undefined, 'normal')
        const contactName = vendor.contactPerson 
          ? `${vendor.contactPerson.firstName || ''} ${vendor.contactPerson.lastName || ''}`.trim()
          : 'N/A'
        doc.text(`Name: ${contactName}`, 20, yPosition)
        yPosition += 5
        doc.text(`Email: ${vendor.contactPerson?.email || vendor.email || 'N/A'}`, 20, yPosition)
        yPosition += 5
        doc.text(`Phone: ${vendor.contactPerson?.phone || vendor.phone || 'N/A'}`, 20, yPosition)
        yPosition += 8

        // Business Details
        if (vendor.businessDetails) {
          doc.setFont(undefined, 'bold')
          doc.text('Business Details:', 14, yPosition)
          yPosition += 6
          doc.setFont(undefined, 'normal')
          doc.text(`License: ${vendor.businessDetails.licenseNumber || 'N/A'}`, 20, yPosition)
          yPosition += 5
          doc.text(`Tax ID: ${vendor.businessDetails.taxId || 'N/A'}`, 20, yPosition)
          yPosition += 5
          if (vendor.businessDetails.website) {
            doc.text(`Website: ${vendor.businessDetails.website}`, 20, yPosition)
            yPosition += 5
          }
          if (vendor.businessDetails.address) {
            const addr = vendor.businessDetails.address
            doc.text(`Address: ${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}, ${addr.country || ''}`, 20, yPosition)
            yPosition += 8
          }
        }

        // Services
        if (vendor.services) {
          doc.setFont(undefined, 'bold')
          doc.text('Services:', 14, yPosition)
          yPosition += 6
          doc.setFont(undefined, 'normal')
          if (vendor.services.airportTransfers?.enabled) {
            const vehicleTypes = vendor.services.airportTransfers.vehicleTypes?.join(', ') || 'N/A'
            doc.text(`Airport Transfers: ${vehicleTypes}`, 20, yPosition)
            yPosition += 5
          }
          if (vendor.services.hotelTransfers?.enabled) {
            doc.text('Hotel Transfers: Enabled', 20, yPosition)
            yPosition += 5
          }
          if (vendor.services.cityTours?.enabled) {
            doc.text('City Tours: Enabled', 20, yPosition)
            yPosition += 5
          }
          yPosition += 5
        }

        // Pricing
        if (vendor.pricing) {
          doc.setFont(undefined, 'bold')
          doc.text('Pricing:', 14, yPosition)
          yPosition += 6
          doc.setFont(undefined, 'normal')
          doc.text(`Base Rate: ${vendor.pricing.currency || 'USD'} ${vendor.pricing.baseRate || 0}`, 20, yPosition)
          yPosition += 5
          if (vendor.pricing.perKmRate) {
            doc.text(`Per KM: ${vendor.pricing.currency || 'USD'} ${vendor.pricing.perKmRate}`, 20, yPosition)
            yPosition += 5
          }
          if (vendor.pricing.waitingTimeRate) {
            doc.text(`Waiting Time: ${vendor.pricing.currency || 'USD'} ${vendor.pricing.waitingTimeRate}`, 20, yPosition)
            yPosition += 5
          }
          if (vendor.pricing.nightSurcharge) {
            doc.text(`Night Surcharge: ${vendor.pricing.currency || 'USD'} ${vendor.pricing.nightSurcharge}`, 20, yPosition)
            yPosition += 5
          }
          yPosition += 5
        }

        // Performance Metrics
        if (vendor.performance) {
          doc.setFont(undefined, 'bold')
          doc.text('Performance Metrics:', 14, yPosition)
          yPosition += 6
          doc.setFont(undefined, 'normal')
          doc.text(`Rating: ${(vendor.performance.rating || 0).toFixed(1)}/5.0`, 20, yPosition)
          yPosition += 5
          doc.text(`Total Bookings: ${vendor.performance.totalBookings || 0}`, 20, yPosition)
          yPosition += 5
          doc.text(`Completed: ${vendor.performance.completedBookings || 0}`, 20, yPosition)
          yPosition += 5
          doc.text(`Cancelled: ${vendor.performance.cancelledBookings || 0}`, 20, yPosition)
          yPosition += 5
          const completionRate = vendor.performance.totalBookings > 0
            ? ((vendor.performance.completedBookings / vendor.performance.totalBookings) * 100).toFixed(1)
            : '0.0'
          doc.text(`Completion Rate: ${completionRate}%`, 20, yPosition)
          yPosition += 5
          if (vendor.performance.averageResponseTime) {
            doc.text(`Avg Response Time: ${vendor.performance.averageResponseTime} minutes`, 20, yPosition)
            yPosition += 5
          }
          yPosition += 5
        }

        // Notes
        if (vendor.notes) {
          doc.setFont(undefined, 'bold')
          doc.text('Notes:', 14, yPosition)
          yPosition += 6
          doc.setFont(undefined, 'normal')
          const splitNotes = doc.splitTextToSize(vendor.notes, 170)
          doc.text(splitNotes, 20, yPosition)
          yPosition += splitNotes.length * 5 + 5
        }

        yPosition += 10
      })

      doc.save(`vendors-detailed-report-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Vendors detailed report exported to PDF!')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('Failed to export PDF')
    } finally {
      setExportLoading(false)
    }
  }

  const exportToCSV = (type = 'transfers') => {
    let data, headers, filename
    if (type === 'transfers') {
      if (!transfers || transfers.length === 0) {
        toast.error('No transfers data to export')
        return
      }
      data = transfers
      headers = ['Transfer ID', 'Customer Name', 'Customer Email', 'Flight Number', 'Airline', 'Arrival Airport', 'Vendor', 'Driver', 'Status', 'Created Date']
      filename = `transfers-report-${new Date().toISOString().split('T')[0]}.csv`
    } else if (type === 'customers') {
      if (!customers || customers.length === 0) {
        toast.error('No customers data to export')
        return
      }
      data = customers
      headers = ['Username', 'Name', 'Email', 'Phone', 'Role']
      filename = `customers-report-${new Date().toISOString().split('T')[0]}.csv`
    } else if (type === 'vendors') {
      if (!vendors || vendors.length === 0) {
        toast.error('No vendors data to export')
        return
      }
      data = vendors
      headers = [
        'Company Name', 'Vendor ID', 'Contact Person', 'Email', 'Phone', 
        'License Number', 'Tax ID', 'Address', 'Website', 'Vehicle Types',
        'Status', 'Rating', 'Total Bookings', 'Completed Bookings', 'Cancelled Bookings',
        'Completion Rate', 'Base Rate', 'Currency', 'Per KM Rate', 'Waiting Time Rate',
        'Night Surcharge', 'Notes'
      ]
      filename = `vendors-detailed-report-${new Date().toISOString().split('T')[0]}.csv`
    }

    setExportLoading(true)
    try {
      const rows = data.map(item => {
        if (type === 'transfers') {
          return [
            item._id || '',
            item.customer_details?.name || '',
            item.customer_details?.email || '',
            item.flight_details?.flight_no || item.flight_details?.flight_number || '',
            item.flight_details?.airline || '',
            item.flight_details?.arrival_airport || item.flight_details?.arrivalAirport || '',
            item.vendor_details?.vendor_name || item.vendor_details?.vendor_id || '',
            item.assigned_driver_details?.driver_name || item.assigned_driver_details?.name || '',
            item.transfer_details?.transfer_status || item.transfer_details?.status || '',
            item.createdAt || new Date().toISOString()
          ]
        } else if (type === 'customers') {
          return [
            item.username || '',
            `${item.profile?.firstName || ''} ${item.profile?.lastName || ''}`.trim() || '',
            item.email || '',
            item.profile?.phone || '',
            item.role || 'CUSTOMER'
          ]
        } else if (type === 'vendors') {
          const contactName = item.contactPerson 
            ? `${item.contactPerson.firstName || ''} ${item.contactPerson.lastName || ''}`.trim()
            : ''
          const address = item.businessDetails?.address
            ? `${item.businessDetails.address.street || ''}, ${item.businessDetails.address.city || ''}, ${item.businessDetails.address.state || ''} ${item.businessDetails.address.zipCode || ''}, ${item.businessDetails.address.country || ''}`
            : ''
          const completionRate = item.performance?.totalBookings > 0
            ? ((item.performance.completedBookings / item.performance.totalBookings) * 100).toFixed(1)
            : '0.0'
          const vehicleTypes = item.services?.airportTransfers?.vehicleTypes?.join('; ') || ''
          
          return [
            item.companyName || item.name || '',
            item.vendorId || item._id || '',
            contactName,
            item.contactPerson?.email || item.email || '',
            item.contactPerson?.phone || item.phone || '',
            item.businessDetails?.licenseNumber || '',
            item.businessDetails?.taxId || '',
            address,
            item.businessDetails?.website || '',
            vehicleTypes,
            item.status || 'pending',
            (item.performance?.rating || item.rating || 0).toFixed(1),
            item.performance?.totalBookings || 0,
            item.performance?.completedBookings || 0,
            item.performance?.cancelledBookings || 0,
            completionRate + '%',
            item.pricing?.baseRate || 0,
            item.pricing?.currency || 'USD',
            item.pricing?.perKmRate || 0,
            item.pricing?.waitingTimeRate || 0,
            item.pricing?.nightSurcharge || 0,
            item.notes || ''
          ]
        }
      })

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported to CSV!`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    } finally {
      setExportLoading(false)
    }
  }

  const getRoleBasedTitle = () => {
        return 'System Reports'
  }

  const getRoleBasedSubtitle = () => {
        return 'Complete system analytics and performance metrics'
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto p-10">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground m-0">
            {getRoleBasedTitle()}
          </h1>
          <p className="text-muted-foreground mt-2 mb-0">
            {getRoleBasedSubtitle()}
          </p>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-5">
          Export Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Transfers Export */}
          <div className="bg-card border-2 theme-border rounded-lg p-4 theme-shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Truck size={20} className="text-blue-600 dark:text-blue-400" />
              <h4 className="text-base font-semibold theme-text-heading m-0">
                Transfers ({transfers.length})
              </h4>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <button
                onClick={() => exportToCSV('transfers')}
                disabled={exportLoading || transfers.length === 0}
                className={`px-3 py-2 bg-success-600 dark:bg-success-700 text-white border-none rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  exportLoading || transfers.length === 0 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-success-700 dark:hover:bg-success-600'
                }`}
              >
                <FileSpreadsheet size={14} />
                CSV (All)
              </button>
              <button
                onClick={exportTransfersToPDF}
                disabled={exportLoading || transfers.length === 0}
                className={`px-3 py-2 bg-danger-600 dark:bg-danger-700 text-white border-none rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  exportLoading || transfers.length === 0 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-danger-700 dark:hover:bg-danger-600'
                }`}
              >
                <FileText size={14} />
                PDF (All)
              </button>
            </div>
            
            {/* Individual Transfer Download */}
            <div className="mt-4 pt-3 border-t theme-border transfer-dropdown-container">
              <label className="text-xs theme-text-secondary mb-2 block">
                Download Individual Report:
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTransferDropdown(!showTransferDropdown)}
                  disabled={transfers.length === 0 || exportLoading}
                  className={`w-full px-3 py-2 text-sm theme-border rounded-md bg-card theme-text-primary flex items-center justify-between gap-2 transition-all ${
                    transfers.length === 0 || exportLoading
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer'
                  }`}
                >
                  <span className="truncate">
                    {selectedTransfer 
                      ? transfers.find(t => t._id === selectedTransfer || t.id === selectedTransfer) 
                        ? `${transfers.find(t => t._id === selectedTransfer || t.id === selectedTransfer).customer_details?.name || 'Transfer'} - ${transfers.find(t => t._id === selectedTransfer || t.id === selectedTransfer).flight_details?.flight_no || transfers.find(t => t._id === selectedTransfer || t.id === selectedTransfer).flight_details?.flight_number || 'N/A'}`
                        : 'Select transfer...'
                      : 'Select transfer...'}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showTransferDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showTransferDropdown && transfers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-border sticky top-0 bg-card">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search transfers..."
                          value={transferSearchTerm}
                          onChange={(e) => setTransferSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-border rounded bg-background text-foreground outline-none focus:border-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    {/* Transfer List */}
                    <div className="overflow-y-auto max-h-48">
                      {transfers
                        .filter(transfer => {
                          if (!transferSearchTerm) return true
                          const searchLower = transferSearchTerm.toLowerCase()
                          const customerName = (transfer.customer_details?.name || '').toLowerCase()
                          const customerEmail = (transfer.customer_details?.email || '').toLowerCase()
                          const flightNo = (transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || '').toLowerCase()
                          const vendorName = (transfer.vendor_details?.vendor_name || '').toLowerCase()
                          const transferId = (transfer._id || '').toLowerCase()
                          return customerName.includes(searchLower) || customerEmail.includes(searchLower) || flightNo.includes(searchLower) || vendorName.includes(searchLower) || transferId.includes(searchLower)
                        })
                        .map(transfer => {
                          const transferLabel = `${transfer.customer_details?.name || 'Transfer'} - ${transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || 'N/A'}`
                          return (
                            <div
                              key={transfer._id || transfer.id}
                              onClick={() => {
                                setSelectedTransfer(transfer._id || transfer.id)
                                setShowTransferDropdown(false)
                                setTransferSearchTerm('')
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                                (transfer._id || transfer.id) === selectedTransfer ? 'bg-primary/10 text-primary' : 'text-foreground'
                              }`}
                            >
                              <div className="font-medium truncate">{transferLabel}</div>
                              <div className="text-xs text-muted-foreground">
                                {transfer.customer_details?.email || ''} • {(transfer.transfer_details?.transfer_status || transfer.transfer_details?.status || 'Pending').replace('_', ' ')}
                              </div>
                            </div>
                          )
                        })}
                      
                      {transfers.filter(transfer => {
                        if (!transferSearchTerm) return false
                        const searchLower = transferSearchTerm.toLowerCase()
                        const customerName = (transfer.customer_details?.name || '').toLowerCase()
                        const customerEmail = (transfer.customer_details?.email || '').toLowerCase()
                        const flightNo = (transfer.flight_details?.flight_no || transfer.flight_details?.flight_number || '').toLowerCase()
                        const vendorName = (transfer.vendor_details?.vendor_name || '').toLowerCase()
                        const transferId = (transfer._id || '').toLowerCase()
                        return customerName.includes(searchLower) || customerEmail.includes(searchLower) || flightNo.includes(searchLower) || vendorName.includes(searchLower) || transferId.includes(searchLower)
                      }).length === 0 && transferSearchTerm && (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          No transfers found matching "{transferSearchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedTransfer && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      const transfer = transfers.find(t => t._id === selectedTransfer || t.id === selectedTransfer)
                      if (transfer) exportIndividualTransferCSV(transfer)
                    }}
                    disabled={exportLoading}
                    className="flex-1 px-3 py-1.5 bg-success-500 dark:bg-success-600 text-white border-none rounded text-xs hover:bg-success-600 dark:hover:bg-success-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    Download CSV
                  </button>
                  <button
                    onClick={() => {
                      const transfer = transfers.find(t => t._id === selectedTransfer || t.id === selectedTransfer)
                      if (transfer) exportIndividualTransferPDF(transfer)
                    }}
                    disabled={exportLoading}
                    className="flex-1 px-3 py-1.5 bg-danger-500 dark:bg-danger-600 text-white border-none rounded text-xs hover:bg-danger-600 dark:hover:bg-danger-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileText size={14} />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Customers Export */}
          <div className="bg-card border-2 theme-border rounded-lg p-4 theme-shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
              <h4 className="text-base font-semibold theme-text-heading m-0">
                Customers ({customers.length})
              </h4>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <button
                onClick={() => exportToCSV('customers')}
                disabled={exportLoading || customers.length === 0}
                className={`px-3 py-2 bg-success-600 dark:bg-success-700 text-white border-none rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  exportLoading || customers.length === 0 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-success-700 dark:hover:bg-success-600'
                }`}
              >
                <FileSpreadsheet size={14} />
                CSV (All)
              </button>
              <button
                onClick={exportCustomersToPDF}
                disabled={exportLoading || customers.length === 0}
                className={`px-3 py-2 bg-danger-600 dark:bg-danger-700 text-white border-none rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  exportLoading || customers.length === 0 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-danger-700 dark:hover:bg-danger-600'
                }`}
              >
                <FileText size={14} />
                PDF (All)
              </button>
            </div>
            
            {/* Individual Customer Download */}
            <div className="mt-4 pt-3 border-t theme-border customer-dropdown-container">
              <label className="text-xs theme-text-secondary mb-2 block">
                Download Individual Report:
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  disabled={customers.length === 0 || exportLoading}
                  className={`w-full px-3 py-2 text-sm theme-border rounded-md bg-card theme-text-primary flex items-center justify-between gap-2 transition-all ${
                    customers.length === 0 || exportLoading
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer'
                  }`}
                >
                  <span className="truncate">
                    {selectedCustomer 
                      ? customers.find(c => c._id === selectedCustomer || c.id === selectedCustomer) 
                        ? `${customers.find(c => c._id === selectedCustomer || c.id === selectedCustomer).profile?.firstName || ''} ${customers.find(c => c._id === selectedCustomer || c.id === selectedCustomer).profile?.lastName || ''}`.trim() || customers.find(c => c._id === selectedCustomer || c.id === selectedCustomer).username || 'Customer'
                        : 'Select customer...'
                      : 'Select customer...'}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-border sticky top-0 bg-card">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={customerSearchTerm}
                          onChange={(e) => setCustomerSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-border rounded bg-background text-foreground outline-none focus:border-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    {/* Customer List */}
                    <div className="overflow-y-auto max-h-48">
                      {customers
                        .filter(customer => {
                          if (!customerSearchTerm) return true
                          const searchLower = customerSearchTerm.toLowerCase()
                          const name = `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim().toLowerCase()
                          const username = (customer.username || '').toLowerCase()
                          const email = (customer.email || '').toLowerCase()
                          return name.includes(searchLower) || username.includes(searchLower) || email.includes(searchLower)
                        })
                        .map(customer => {
                          const customerName = `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() || customer.username || 'Customer'
                          return (
                            <div
                              key={customer._id || customer.id}
                              onClick={() => {
                                setSelectedCustomer(customer._id || customer.id)
                                setShowCustomerDropdown(false)
                                setCustomerSearchTerm('')
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                                (customer._id || customer.id) === selectedCustomer ? 'bg-primary/10 text-primary' : 'text-foreground'
                              }`}
                            >
                              <div className="font-medium">{customerName}</div>
                              <div className="text-xs text-muted-foreground">{customer.email}</div>
                            </div>
                          )
                        })}
                      
                      {customers.filter(customer => {
                        if (!customerSearchTerm) return false
                        const searchLower = customerSearchTerm.toLowerCase()
                        const name = `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim().toLowerCase()
                        const username = (customer.username || '').toLowerCase()
                        const email = (customer.email || '').toLowerCase()
                        return name.includes(searchLower) || username.includes(searchLower) || email.includes(searchLower)
                      }).length === 0 && customerSearchTerm && (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          No customers found matching "{customerSearchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedCustomer && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      const customer = customers.find(c => c._id === selectedCustomer || c.id === selectedCustomer)
                      if (customer) exportIndividualPersonCSV(customer)
                    }}
                    disabled={exportLoading}
                    className="flex-1 px-3 py-1.5 bg-success-500 dark:bg-success-600 text-white border-none rounded text-xs hover:bg-success-600 dark:hover:bg-success-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    Download CSV
                  </button>
                  <button
                    onClick={() => {
                      const customer = customers.find(c => c._id === selectedCustomer || c.id === selectedCustomer)
                      if (customer) exportIndividualPersonPDF(customer)
                    }}
                    disabled={exportLoading}
                    className="flex-1 px-3 py-1.5 bg-danger-500 dark:bg-danger-600 text-white border-none rounded text-xs hover:bg-danger-600 dark:hover:bg-danger-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileText size={14} />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Vendors Export */}
          <div className="bg-card border-2 theme-border rounded-lg p-4 theme-shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
              <h4 className="text-base font-semibold theme-text-heading m-0">
                Vendors ({vendors.length})
              </h4>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <button
                onClick={() => exportToCSV('vendors')}
                disabled={exportLoading || vendors.length === 0}
                className={`px-3 py-2 bg-success-600 dark:bg-success-700 text-white border-none rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  exportLoading || vendors.length === 0 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-success-700 dark:hover:bg-success-600'
                }`}
              >
                <FileSpreadsheet size={14} />
                CSV (All)
              </button>
              <button
                onClick={exportVendorsToPDF}
                disabled={exportLoading || vendors.length === 0}
                className={`px-3 py-2 bg-danger-600 dark:bg-danger-700 text-white border-none rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  exportLoading || vendors.length === 0 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-danger-700 dark:hover:bg-danger-600'
                }`}
              >
                <FileText size={14} />
                PDF (All)
              </button>
            </div>
            
            {/* Individual Vendor Download */}
            <div className="mt-4 pt-3 border-t theme-border vendor-dropdown-container">
              <label className="text-xs theme-text-secondary mb-2 block">
                Download Individual Report:
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                  disabled={vendors.length === 0 || exportLoading}
                  className={`w-full px-3 py-2 text-sm theme-border rounded-md bg-card theme-text-primary flex items-center justify-between gap-2 transition-all ${
                    vendors.length === 0 || exportLoading
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer'
                  }`}
                >
                  <span className="truncate">
                    {selectedVendor 
                      ? vendors.find(v => v._id === selectedVendor || v.id === selectedVendor || v.vendorId === selectedVendor) 
                        ? vendors.find(v => v._id === selectedVendor || v.id === selectedVendor || v.vendorId === selectedVendor).companyName || vendors.find(v => v._id === selectedVendor || v.id === selectedVendor || v.vendorId === selectedVendor).name || 'Vendor'
                        : 'Select vendor...'
                      : 'Select vendor...'}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showVendorDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showVendorDropdown && vendors.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-border sticky top-0 bg-card">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search vendors..."
                          value={vendorSearchTerm}
                          onChange={(e) => setVendorSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 text-sm border border-border rounded bg-background text-foreground outline-none focus:border-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    {/* Vendor List */}
                    <div className="overflow-y-auto max-h-48">
                      {vendors
                        .filter(vendor => {
                          if (!vendorSearchTerm) return true
                          const searchLower = vendorSearchTerm.toLowerCase()
                          const companyName = (vendor.companyName || vendor.name || '').toLowerCase()
                          const vendorId = (vendor.vendorId || vendor._id || '').toLowerCase()
                          const email = (vendor.contactPerson?.email || vendor.email || '').toLowerCase()
                          const contactName = vendor.contactPerson 
                            ? `${vendor.contactPerson.firstName || ''} ${vendor.contactPerson.lastName || ''}`.trim().toLowerCase()
                            : ''
                          return companyName.includes(searchLower) || vendorId.includes(searchLower) || email.includes(searchLower) || contactName.includes(searchLower)
                        })
                        .map(vendor => {
                          const vendorName = vendor.companyName || vendor.name || 'Vendor'
                          return (
                            <div
                              key={vendor._id || vendor.id || vendor.vendorId}
                              onClick={() => {
                                setSelectedVendor(vendor._id || vendor.id || vendor.vendorId)
                                setShowVendorDropdown(false)
                                setVendorSearchTerm('')
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                                (vendor._id || vendor.id || vendor.vendorId) === selectedVendor ? 'bg-primary/10 text-primary' : 'text-foreground'
                              }`}
                            >
                              <div className="font-medium">{vendorName}</div>
                              <div className="text-xs text-muted-foreground">
                                {vendor.contactPerson?.email || vendor.email || ''} • {(vendor.status || 'pending').replace('_', ' ')}
                              </div>
                            </div>
                          )
                        })}
                      
                      {vendors.filter(vendor => {
                        if (!vendorSearchTerm) return false
                        const searchLower = vendorSearchTerm.toLowerCase()
                        const companyName = (vendor.companyName || vendor.name || '').toLowerCase()
                        const vendorId = (vendor.vendorId || vendor._id || '').toLowerCase()
                        const email = (vendor.contactPerson?.email || vendor.email || '').toLowerCase()
                        const contactName = vendor.contactPerson 
                          ? `${vendor.contactPerson.firstName || ''} ${vendor.contactPerson.lastName || ''}`.trim().toLowerCase()
                          : ''
                        return companyName.includes(searchLower) || vendorId.includes(searchLower) || email.includes(searchLower) || contactName.includes(searchLower)
                      }).length === 0 && vendorSearchTerm && (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          No vendors found matching "{vendorSearchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedVendor && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      const vendor = vendors.find(v => v._id === selectedVendor || v.id === selectedVendor || v.vendorId === selectedVendor)
                      if (vendor) exportIndividualVendorCSV(vendor)
                    }}
                    disabled={exportLoading}
                    className="flex-1 px-3 py-1.5 bg-success-500 dark:bg-success-600 text-white border-none rounded text-xs hover:bg-success-600 dark:hover:bg-success-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    Download CSV
                  </button>
                  <button
                    onClick={() => {
                      const vendor = vendors.find(v => v._id === selectedVendor || v.id === selectedVendor || v.vendorId === selectedVendor)
                      if (vendor) exportIndividualVendorPDF(vendor)
                    }}
                    disabled={exportLoading}
                    className="flex-1 px-3 py-1.5 bg-danger-500 dark:bg-danger-600 text-white border-none rounded text-xs hover:bg-danger-600 dark:hover:bg-danger-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileText size={14} />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="theme-grid-metrics mb-8">
        <div className="theme-metric-card">
          <div className="flex items-center mb-4">
            <div className="theme-metric-icon-container theme-icon-bg-blue">
              <Truck size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="theme-metric-title">
                Total Transfers
              </h3>
              <p className="theme-metric-subtitle">
                All time
              </p>
            </div>
          </div>
          <div className="theme-metric-value">
            {reports?.totalTransfers || 0}
          </div>
        </div>

        <div className="theme-metric-card">
          <div className="flex items-center mb-4">
            <div className="theme-metric-icon-container theme-icon-bg-green">
              <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="theme-metric-title">
                Success Rate
              </h3>
              <p className="theme-metric-subtitle">
                Completion rate
              </p>
            </div>
          </div>
          <div className="theme-metric-value-colored text-green-600 dark:text-green-400">
            {reports?.successRate || 0}%
          </div>
        </div>

        <div className="theme-metric-card">
          <div className="flex items-center mb-4">
            <div className="theme-metric-icon-container theme-icon-bg-yellow">
              <Users size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="theme-metric-title">
                Total Customers
              </h3>
              <p className="theme-metric-subtitle">
                Registered users
              </p>
            </div>
          </div>
          <div className="theme-metric-value">
            {reports?.totalCustomers || 0}
          </div>
        </div>

        <div className="theme-metric-card">
          <div className="flex items-center mb-4">
            <div className="theme-metric-icon-container theme-icon-bg-blue">
              <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="theme-metric-title">
                Active Vendors
              </h3>
              <p className="theme-metric-subtitle">
                Total: {reports?.totalVendors || 0}
              </p>
            </div>
          </div>
          <div className="theme-metric-value-colored text-blue-600 dark:text-blue-400">
            {reports?.activeVendors || 0}
          </div>
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="theme-card mb-8">
        <h3 className="text-xl font-semibold theme-text-heading mb-6">
          Transfer Status Breakdown
        </h3>
        <div className="theme-grid-status">
          <div className="theme-status-completed p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {reports?.completedTransfers || 0}
            </div>
            <div className="text-sm font-medium text-green-700 dark:text-green-300 mt-1">
              Completed
            </div>
          </div>
          <div className="theme-status-in-progress p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {reports?.inProgressTransfers || 0}
            </div>
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">
              In Progress
            </div>
          </div>
          <div className="theme-status-pending p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {reports?.pendingTransfers || 0}
            </div>
            <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mt-1">
              Pending
            </div>
          </div>
          <div className="theme-status-cancelled p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {reports?.cancelledTransfers || 0}
            </div>
            <div className="text-sm font-medium text-red-700 dark:text-red-300 mt-1">
              Cancelled
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="theme-grid-auto-fit mb-8">
        <div className="theme-metric-card">
          <div className="flex items-center mb-4">
            <div className="theme-metric-icon-container theme-icon-bg-yellow">
              <Clock size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h3 className="theme-metric-title">
                Avg. Completion Time
              </h3>
            </div>
          </div>
          <div className="theme-metric-value-colored text-yellow-600 dark:text-yellow-400">
            {reports?.averageCompletionTime || 'N/A'}
          </div>
        </div>

        <div className="theme-metric-card">
          <div className="flex items-center mb-4">
            <div className="theme-metric-icon-container theme-icon-bg-blue">
              <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="theme-metric-title">
                Monthly Growth
              </h3>
            </div>
          </div>
          <div className="theme-metric-value-colored text-blue-600 dark:text-blue-400">
            {reports?.monthlyGrowth >= 0 ? '+' : ''}{reports?.monthlyGrowth || 0}%
          </div>
        </div>

        <div className="theme-metric-card">
          <div className="flex items-center mb-4">
            <div className="theme-metric-icon-container theme-icon-bg-purple">
              <Truck size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="theme-metric-title">
                Top Vendor
              </h3>
            </div>
          </div>
          <div className="theme-text-heading text-lg">
            {reports?.topVendor || 'N/A'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Reports
