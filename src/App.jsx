import React, { useState, useEffect } from 'react'
import { Search, MapPin, Tag, Plus, QrCode, Download, Printer, ExternalLink, Box, Zap, Trash2, Edit, Settings, X, Lock, LogOut, Package, Check } from 'lucide-react'
import QRCodeLib from 'qrcode'
import { supabase } from './supabaseClient'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Select } from './components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog'
import { Label } from './components/ui/label'
import { Textarea } from './components/ui/textarea'

// ⚠️ CHANGE THIS PASSWORD TO WHATEVER YOU WANT ⚠️
const APP_PASSWORD = 'scicbed2025'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [boxes, setBoxes] = useState([])
  const [locations, setLocations] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentBox, setCurrentBox] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [items, setItems] = useState([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    category: '',
    description: ''
  })

  const [newLocation, setNewLocation] = useState('')
  const [newCategory, setNewCategory] = useState('')

  // Check if already authenticated (stored in localStorage)
  useEffect(() => {
    const storedAuth = localStorage.getItem('qr_box_auth')
    if (storedAuth === 'true') {
      setIsAuthenticated(true)
    } else {
      setLoading(false)
    }
  }, [])

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData()
    }
  }, [isAuthenticated])

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (passwordInput === APP_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('qr_box_auth', 'true')
      setPasswordError(false)
    } else {
      setPasswordError(true)
      setPasswordInput('')
    }
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to lock the app?')) {
      setIsAuthenticated(false)
      localStorage.removeItem('qr_box_auth')
      setPasswordInput('')
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchBoxes(),
        fetchLocations(),
        fetchCategories()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from('boxes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setBoxes(data || [])
    } catch (error) {
      console.error('Error fetching boxes:', error)
      alert('Error loading boxes. Check console for details.')
    }
  }

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchItems = async (boxId) => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('box_id', boxId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      alert('Error loading items. Check console for details.')
    }
  }

  useEffect(() => {
    if (isAuthenticated && boxes.length > 0) {
      const urlParams = new URLSearchParams(window.location.search)
      const boxId = urlParams.get('box')
      if (boxId) {
        const box = boxes.find(b => b.id === parseInt(boxId))
        if (box) {
          handleViewBox(box)
        }
      }
    }
  }, [boxes, isAuthenticated])

  const filteredBoxes = boxes.filter(box => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || 
      box.name.toLowerCase().includes(searchLower) || 
      (box.description && box.description.toLowerCase().includes(searchLower)) ||
      box.location.toLowerCase().includes(searchLower) ||
      box.category.toLowerCase().includes(searchLower)
    const matchesLocation = !locationFilter || box.location === locationFilter
    const matchesCategory = !categoryFilter || box.category === categoryFilter
    return matchesSearch && matchesLocation && matchesCategory
  })

  const handleCreateBox = async (e) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('boxes')
        .insert([formData])
        .select()
      
      if (error) throw error
      
      setBoxes([data[0], ...boxes])
      setCreateModalOpen(false)
      setFormData({ name: '', location: '', category: '', description: '' })
    } catch (error) {
      console.error('Error creating box:', error)
      alert('Error creating box. Check console for details.')
    }
  }

  const handleViewBox = async (box) => {
    setCurrentBox(box)
    setFormData({
      name: box.name,
      location: box.location,
      category: box.category,
      description: box.description || ''
    })
    setEditMode(false)
    setViewModalOpen(true)
    await fetchItems(box.id)
  }

  const handleEditBox = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('boxes')
        .update(formData)
        .eq('id', currentBox.id)
      
      if (error) throw error
      
      setBoxes(boxes.map(box => 
        box.id === currentBox.id 
          ? { ...box, ...formData }
          : box
      ))
      setCurrentBox({ ...currentBox, ...formData })
      setEditMode(false)
    } catch (error) {
      console.error('Error updating box:', error)
      alert('Error updating box. Check console for details.')
    }
  }

  const handleDeleteBox = async () => {
    if (window.confirm(`Are you sure you want to delete "${currentBox.name}"? This will also delete all items inside.`)) {
      try {
        const { error } = await supabase
          .from('boxes')
          .delete()
          .eq('id', currentBox.id)
        
        if (error) throw error
        
        setBoxes(boxes.filter(box => box.id !== currentBox.id))
        setViewModalOpen(false)
        setCurrentBox(null)
      } catch (error) {
        console.error('Error deleting box:', error)
        alert('Error deleting box. Check console for details.')
      }
    }
  }

  // Item management functions
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{
          box_id: currentBox.id,
          name: newItemName.trim(),
          quantity: newItemQuantity
        }])
        .select()
      
      if (error) throw error
      
      setItems([...items, data[0]])
      setNewItemName('')
      setNewItemQuantity(1)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item. Check console for details.')
    }
  }

  const handleToggleItem = async (item) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ checked: !item.checked })
        .eq('id', item.id)
      
      if (error) throw error
      
      setItems(items.map(i => 
        i.id === item.id 
          ? { ...i, checked: !i.checked }
          : i
      ))
    } catch (error) {
      console.error('Error toggling item:', error)
      alert('Error updating item. Check console for details.')
    }
  }

  const handleDeleteItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
      
      if (error) throw error
      
      setItems(items.filter(i => i.id !== itemId))
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error deleting item. Check console for details.')
    }
  }

  const handleAddLocation = async (e) => {
    e.preventDefault()
    if (!newLocation.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert([{ name: newLocation.trim() }])
        .select()
      
      if (error) {
        if (error.code === '23505') {
          alert('This location already exists!')
        } else {
          throw error
        }
        return
      }
      
      setLocations([...locations, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setNewLocation('')
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Error adding location. Check console for details.')
    }
  }

  const handleDeleteLocation = async (id, name) => {
    if (window.confirm(`Delete location "${name}"? Boxes using this location will still keep it.`)) {
      try {
        const { error } = await supabase
          .from('locations')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        setLocations(locations.filter(loc => loc.id !== id))
      } catch (error) {
        console.error('Error deleting location:', error)
        alert('Error deleting location. Check console for details.')
      }
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategory.trim() }])
        .select()
      
      if (error) {
        if (error.code === '23505') {
          alert('This category already exists!')
        } else {
          throw error
        }
        return
      }
      
      setCategories([...categories, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategory('')
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Error adding category. Check console for details.')
    }
  }

  const handleDeleteCategory = async (id, name) => {
    if (window.confirm(`Delete category "${name}"? Boxes using this category will still keep it.`)) {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        setCategories(categories.filter(cat => cat.id !== id))
      } catch (error) {
        console.error('Error deleting category:', error)
        alert('Error deleting category. Check console for details.')
      }
    }
  }

  const handleShowQR = async (box, e) => {
    e.stopPropagation()
    setCurrentBox(box)
    const boxUrl = `${window.location.origin}${window.location.pathname}?box=${box.id}`
    
    try {
      const dataUrl = await QRCodeLib.toDataURL(boxUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#000000'
        }
      })
      setQrDataUrl(dataUrl)
      setQrModalOpen(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownloadQR = () => {
    const link = document.createElement('a')
    link.download = `${currentBox.name.replace(/\s+/g, '_')}_QR.png`
    link.href = qrDataUrl
    link.click()
  }

  const handlePrintLabel = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
      <head>
        <title>Print Label - ${currentBox.name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px;
            background: #000;
            color: #fff;
          }
          h1 { margin-bottom: 10px; }
          img { border: 2px solid #fff; padding: 10px; background: #000; }
        </style>
      </head>
      <body>
        <h1>${currentBox.name}</h1>
        <p>${currentBox.location} - ${currentBox.category}</p>
        <img src="${qrDataUrl}" />
        <p>${currentBox.description || ''}</p>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleOpenBoxFromQR = async () => {
    setQrModalOpen(false)
    setViewModalOpen(true)
    setFormData({
      name: currentBox.name,
      location: currentBox.location,
      category: currentBox.category,
      description: currentBox.description || ''
    })
    await fetchItems(currentBox.id)
  }

  const closeViewModal = () => {
    setViewModalOpen(false)
    setEditMode(false)
    setCurrentBox(null)
    setItems([])
    setNewItemName('')
    setNewItemQuantity(1)
  }

  // Password Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Lock className="w-12 h-12" />
              </div>
            </div>
            <CardTitle className="text-3xl">QR Box Storage</CardTitle>
            <CardDescription>Enter password to access</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value)
                    setPasswordError(false)
                  }}
                  className={passwordError ? 'border-red-500' : ''}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">Incorrect password. Try again.</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <Box className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-xl">Loading your boxes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center py-12 border-b border-border mb-12 relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAdminModalOpen(true)}
              title="Admin Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              title="Lock App"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          <h1 className="text-5xl font-bold mb-3 flex items-center justify-center gap-3">
            <Box className="w-12 h-12" />
            QR Box Storage
          </h1>
          <p className="text-xl text-muted-foreground">Organize your belongings with smart QR codes</p>
        </header>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Boxes
              </CardTitle>
              <CardDescription>Organize items into labeled storage boxes</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Generate QR Codes
              </CardTitle>
              <CardDescription>Get unique QR codes for each box</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Find Items Fast
              </CardTitle>
              <CardDescription>Scan codes to see what's inside</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Global Search & Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="🔍 Global search: name, location, category, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.name}>{loc.name}</option>
            ))}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </Select>
        </div>

        {/* Section Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <h2 className="text-3xl font-bold">
            Your Storage Boxes 
            {searchTerm && <span className="text-muted-foreground text-xl ml-2">({filteredBoxes.length} results)</span>}
          </h2>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Box
          </Button>
        </div>

        {/* Boxes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBoxes.map(box => (
            <Card 
              key={box.id} 
              className="border-border hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer"
              onClick={() => handleViewBox(box)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{box.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleShowQR(box, e)}
                    className="hover:bg-primary hover:text-primary-foreground"
                  >
                    <QrCode className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {box.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {box.category}
                  </div>
                  <p className="text-foreground mt-3">{box.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBoxes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">No boxes found</p>
            <p className="text-sm">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search term.`
                : 'Try adjusting your filters or create your first box!'}
            </p>
          </div>
        )}

        {/* Admin Modal */}
        <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
          <DialogContent onClose={() => setAdminModalOpen(false)} className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Admin Settings
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Locations Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Manage Locations
                </h3>
                <form onSubmit={handleAddLocation} className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add new location..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </form>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No locations yet</p>
                  ) : (
                    locations.map(loc => (
                      <div key={loc.id} className="flex justify-between items-center p-2 hover:bg-secondary rounded">
                        <span>{loc.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLocation(loc.id, loc.name)}
                          className="hover:bg-red-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Categories Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Manage Categories
                </h3>
                <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add new category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </form>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
                  ) : (
                    categories.map(cat => (
                      <div key={cat.id} className="flex justify-between items-center p-2 hover:bg-secondary rounded">
                        <span>{cat.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="hover:bg-red-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Box Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent onClose={() => setCreateModalOpen(false)}>
            <DialogHeader>
              <DialogTitle>Create New Box</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBox} className="space-y-4">
              <div>
                <Label htmlFor="name">Box Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Select
                  id="location"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="mt-1"
                >
                  <option value="">Select location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  id="category"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="mt-1"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's inside this box?"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full">Create Box</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* View/Edit Box Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent onClose={closeViewModal} className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Box' : currentBox?.name}</DialogTitle>
            </DialogHeader>
            
            {editMode ? (
              <form onSubmit={handleEditBox} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Box Name *</Label>
                  <Input
                    id="edit-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-location">Location *</Label>
                  <Select
                    id="edit-location"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="mt-1"
                  >
                    <option value="">Select location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select
                    id="edit-category"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="mt-1"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="What's inside this box?"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Save Changes</Button>
                  <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Box Info */}
                <div className="space-y-4">
                  <div>
                    <Label>Location</Label>
                    <p className="mt-1 text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {currentBox?.location}
                    </p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <p className="mt-1 text-muted-foreground flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      {currentBox?.category}
                    </p>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <p className="mt-1 text-muted-foreground">{currentBox?.description || 'No description'}</p>
                  </div>
                </div>

                {/* Items List */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Items in this box ({items.length})
                  </h3>
                  
                  {/* Add Item Form */}
                  <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
                    <Input
                      placeholder="Item name..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                      className="w-20"
                      placeholder="Qty"
                    />
                    <Button type="submit">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </form>

                  {/* Items List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg p-3">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No items yet. Add your first item above!</p>
                    ) : (
                      items.map(item => (
                        <div 
                          key={item.id} 
                          className={`flex items-center justify-between p-2 hover:bg-secondary rounded ${item.checked ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleItem(item)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                item.checked 
                                  ? 'bg-primary border-primary' 
                                  : 'border-muted-foreground hover:border-primary'
                              }`}
                            >
                              {item.checked && <Check className="w-3 h-3 text-primary-foreground" />}
                            </button>
                            <span className={item.checked ? 'line-through' : ''}>
                              {item.name}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                                ×{item.quantity}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            className="hover:bg-red-500 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button onClick={() => setEditMode(true)} variant="outline" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={(e) => handleShowQR(currentBox, e)} variant="outline" className="flex-1">
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Code
                  </Button>
                  <Button onClick={handleDeleteBox} variant="outline" className="flex-1 hover:bg-red-500 hover:text-white hover:border-red-500">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Code Modal */}
        <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <DialogContent onClose={() => setQrModalOpen(false)}>
            <DialogHeader>
              <DialogTitle>QR Code for {currentBox?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="border-2 border-border rounded-lg p-4" />
              )}
              <div className="flex gap-2 w-full">
                <Button onClick={handleDownloadQR} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={handlePrintLabel} variant="outline" className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button onClick={handleOpenBoxFromQR} className="flex-1">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default App