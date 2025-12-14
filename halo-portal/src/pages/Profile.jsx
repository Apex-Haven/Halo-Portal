import { useState } from 'react'
import { User, Mail, Phone, Building, Car, Save, Edit3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  
  const [profileData, setProfileData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
    email: user?.email || ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    })
  }

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    })
  }

  const handleProfileSave = async () => {
    try {
      setLoading(true)
      const result = await updateProfile(profileData)
      if (result.success) {
        toast.success('Profile updated successfully!')
        setIsEditing(false)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSave = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword)
      if (result.success) {
        toast.success('Password changed successfully!')
        setShowPasswordForm(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return <Building size={20} color="#3b82f6" />
      case 'VENDOR':
        return <Building size={20} color="#3b82f6" />
      case 'CLIENT':
        return <User size={20} color="#3b82f6" />
      case 'DRIVER':
        return <Car size={20} color="#3b82f6" />
      case 'TRAVELER':
        return <User size={20} color="#3b82f6" />
      default:
        return <User size={20} color="#3b82f6" />
    }
  }

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground m-0">
          Profile
        </h1>
        <p className="text-muted-foreground mt-2 mb-0">
          Manage your account information and preferences
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-foreground m-0">
            Personal Information
          </h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground border-none rounded-md cursor-pointer text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Edit3 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Profile Picture */}
          <div className="text-center">
            <div className="w-[120px] h-[120px] bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-border">
              <User size={48} className="text-primary" />
            </div>
            <div className="text-lg font-semibold text-foreground mb-1">
              {user?.profile?.firstName} {user?.profile?.lastName}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {getRoleIcon()}
              <span className="capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={profileData.firstName}
                onChange={handleProfileChange}
                disabled={!isEditing}
                className="w-full py-2.5 px-3 border border-input rounded-md text-base outline-none bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={profileData.lastName}
                onChange={handleProfileChange}
                disabled={!isEditing}
                className="w-full py-2.5 px-3 border border-input rounded-md text-base outline-none bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="w-full pl-10 pr-3 py-2.5 border border-input rounded-md text-base outline-none bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="w-full pl-10 pr-3 py-2.5 border border-input rounded-md text-base outline-none bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            </div>

            {/* Role-specific Information */}
            {user?.vendorId && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Vendor ID
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={user.vendorId}
                    disabled
                    className="w-full pl-10 pr-3 py-2.5 border border-input rounded-md text-base outline-none bg-muted text-muted-foreground"
                  />
                </div>
              </div>
            )}

            {user?.driverId && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Driver ID
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={user.driverId}
                    disabled
                    className="w-full pl-10 pr-3 py-2.5 border border-input rounded-md text-base outline-none bg-muted text-muted-foreground"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-3 mt-6 justify-end">
            <button
              onClick={() => {
                setIsEditing(false)
                setProfileData({
                  firstName: user?.profile?.firstName || '',
                  lastName: user?.profile?.lastName || '',
                  phone: user?.profile?.phone || '',
                  email: user?.email || ''
                })
              }}
              className="px-5 py-2.5 bg-muted text-foreground border-none rounded-md cursor-pointer text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProfileSave}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground border-none rounded-md cursor-pointer text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Password Change */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-foreground m-0">
            Change Password
          </h3>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className={`px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-colors ${
              showPasswordForm 
                ? 'bg-muted text-foreground hover:bg-muted/80' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full py-2.5 px-3 border border-input rounded-md text-base outline-none bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full py-2.5 px-3 border border-input rounded-md text-base outline-none bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full py-2.5 px-3 border border-input rounded-md text-base outline-none bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPasswordForm(false)
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="px-5 py-2.5 bg-muted text-foreground border-none rounded-md cursor-pointer text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSave}
                disabled={loading}
                className="px-5 py-2.5 bg-primary text-primary-foreground border-none rounded-md cursor-pointer text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Save Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
