'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Heart,
  Calendar,
  CheckSquare,
  MessageSquare,
  Bell,
  Settings,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Check,
  ChevronRight,
} from 'lucide-react';

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const couple = {
    name: 'Sophie & Thomas',
    weddingDate: '14 juin 2026',
    daysLeft: 97,
    location: 'Château de Beaumont, Provence',
    guestCount: 120,
    budget: 35000,
    budgetSpent: 18500,
  };

  const tasks = [
    { id: 1, title: 'Confirmer le traiteur', due: 'Dans 5 jours', done: true, category: 'Fournisseurs' },
    { id: 2, title: 'Choisir le menu', due: 'Dans 10 jours', done: false, category: 'Restauration' },
    { id: 3, title: 'Envoyer les faire-parts', due: 'Dans 15 jours', done: false, category: 'Invitations' },
    { id: 4, title: 'Essayage robe - 2ème', due: 'Dans 20 jours', done: false, category: 'Tenue' },
    { id: 5, title: 'Réserver le DJ', due: 'Dans 3 jours', done: false, category: 'Animation' },
  ];

  const savedVendors = [
    {
      id: 'atelier-lumiere',
      name: 'Atelier Lumière',
      category: 'Photographe',
      rating: 4.9,
      price: '2 500€',
      imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'Confirmé',
    },
    {
      id: 'maison-florale',
      name: 'Maison Florale',
      category: 'Fleuriste',
      rating: 4.8,
      price: '1 800€',
      imageUrl: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'En contact',
    },
    {
      id: 'harmonie-musicale',
      name: 'Harmonie Musicale',
      category: 'DJ & Animation',
      rating: 4.9,
      price: '1 200€',
      imageUrl: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'À contacter',
    },
  ];

  const messages = [
    {
      vendor: 'Atelier Lumière',
      preview: 'Bonjour, j\'ai bien reçu votre demande de devis...',
      time: '10:30',
      unread: true,
    },
    {
      vendor: 'Saveurs & Délices',
      preview: 'Merci pour votre confirmation. Voici le menu...',
      time: 'Hier',
      unread: false,
    },
    {
      vendor: 'Maison Florale',
      preview: 'Nous serions ravis de créer vos arrangements...',
      time: 'Lun.',
      unread: false,
    },
  ];

  const budgetCategories = [
    { name: 'Lieu & Hébergement', allocated: 10000, spent: 8000, color: 'bg-rose-500' },
    { name: 'Traiteur', allocated: 9000, spent: 5500, color: 'bg-champagne-500' },
    { name: 'Photographie', allocated: 3500, spent: 2500, color: 'bg-charcoal-400' },
    { name: 'Fleuriste', allocated: 2500, spent: 1800, color: 'bg-rose-300' },
    { name: 'Animation', allocated: 2000, spent: 700, color: 'bg-champagne-300' },
    { name: 'Divers', allocated: 8000, spent: 0, color: 'bg-charcoal-300' },
  ];

  const navItems = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Heart },
    { id: 'tasks', label: 'Tâches', icon: CheckSquare },
    { id: 'vendors', label: 'Prestataires', icon: Star },
    { id: 'budget', label: 'Budget', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  const budgetPercent = Math.round((couple.budgetSpent / couple.budget) * 100);

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-8 h-8 text-rose-600 fill-rose-300" />
                </div>
                <h2 className="font-serif text-heading-md text-charcoal-900">{couple.name}</h2>
                <p className="text-body-sm text-charcoal-600 mt-1">{couple.weddingDate}</p>
              </div>

              <div className="bg-rose-50 rounded-xl p-4 text-center">
                <p className="font-display text-display-md text-rose-600">{couple.daysLeft}</p>
                <p className="text-body-sm text-charcoal-600">jours restants</p>
              </div>
            </div>

            <nav className="bg-white rounded-2xl shadow-soft p-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-body-md font-medium transition-all duration-200 mb-1 ${
                    activeSection === item.id
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-charcoal-700 hover:bg-charcoal-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="border-t border-charcoal-100 mt-2 pt-2">
                <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-body-md font-medium text-charcoal-700 hover:bg-charcoal-50 transition-colors">
                  <Settings className="w-5 h-5" />
                  <span>Paramètres</span>
                </button>
              </div>
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="font-display text-display-md text-charcoal-900">
                    Bonjour, Sophie & Thomas 👋
                  </h1>
                  <button className="relative p-2 text-charcoal-600 hover:text-rose-600 transition-colors">
                    <Bell className="w-6 h-6" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl shadow-soft p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-body-sm text-charcoal-600">Budget utilisé</p>
                      <span className="text-caption font-medium text-rose-600">{budgetPercent}%</span>
                    </div>
                    <p className="font-display text-heading-xl text-charcoal-900">
                      {couple.budgetSpent.toLocaleString('fr-FR')}€
                    </p>
                    <p className="text-body-sm text-charcoal-500">
                      sur {couple.budget.toLocaleString('fr-FR')}€
                    </p>
                    <div className="mt-3 w-full h-2 bg-charcoal-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${budgetPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-soft p-6">
                    <p className="text-body-sm text-charcoal-600 mb-3">Invités confirmés</p>
                    <p className="font-display text-heading-xl text-charcoal-900">
                      {Math.round(couple.guestCount * 0.65)}
                    </p>
                    <p className="text-body-sm text-charcoal-500">sur {couple.guestCount} invités</p>
                    <div className="mt-3 w-full h-2 bg-charcoal-100 rounded-full overflow-hidden">
                      <div className="h-full bg-champagne-500 rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-soft p-6">
                    <p className="text-body-sm text-charcoal-600 mb-3">Tâches accomplies</p>
                    <p className="font-display text-heading-xl text-charcoal-900">
                      {tasks.filter(t => t.done).length}
                    </p>
                    <p className="text-body-sm text-charcoal-500">sur {tasks.length} tâches</p>
                    <div className="mt-3 w-full h-2 bg-charcoal-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${(tasks.filter(t => t.done).length / tasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-soft p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-serif text-heading-md text-charcoal-900">Prochaines tâches</h3>
                      <button
                        onClick={() => setActiveSection('tasks')}
                        className="text-rose-600 text-body-sm hover:underline flex items-center space-x-1"
                      >
                        <span>Voir tout</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {tasks.filter(t => !t.done).slice(0, 4).map((task) => (
                        <li key={task.id} className="flex items-center space-x-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            task.done ? 'bg-rose-600 border-rose-600' : 'border-charcoal-300'
                          }`}>
                            {task.done && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-md text-charcoal-900 truncate">{task.title}</p>
                            <p className="text-caption text-charcoal-500">{task.due}</p>
                          </div>
                          <span className="text-caption px-2 py-1 bg-champagne-50 text-champagne-800 rounded-full flex-shrink-0">
                            {task.category}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-2xl shadow-soft p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-serif text-heading-md text-charcoal-900">Messages récents</h3>
                      <button
                        onClick={() => setActiveSection('messages')}
                        className="text-rose-600 text-body-sm hover:underline flex items-center space-x-1"
                      >
                        <span>Voir tout</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {messages.map((msg, i) => (
                        <li key={i} className="flex items-start space-x-3 p-3 hover:bg-charcoal-50 rounded-xl cursor-pointer transition-colors">
                          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="font-semibold text-rose-600 text-caption">
                              {msg.vendor.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-body-sm font-medium ${msg.unread ? 'text-charcoal-900' : 'text-charcoal-700'}`}>
                                {msg.vendor}
                              </p>
                              <span className="text-caption text-charcoal-500">{msg.time}</span>
                            </div>
                            <p className="text-caption text-charcoal-600 truncate">{msg.preview}</p>
                          </div>
                          {msg.unread && (
                            <div className="w-2 h-2 bg-rose-600 rounded-full mt-2 flex-shrink-0" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-soft p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <MapPin className="w-5 h-5 text-rose-600" />
                    <div>
                      <p className="font-semibold text-charcoal-900">{couple.location}</p>
                      <p className="text-body-sm text-charcoal-600">{couple.weddingDate} · {couple.guestCount} invités</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/vendors" className="btn-primary flex items-center space-x-2 text-body-sm py-2.5">
                      <span>Trouver un prestataire</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/inspiration" className="btn-secondary flex items-center space-x-2 text-body-sm py-2.5">
                      <span>S'inspirer</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'tasks' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-display-md text-charcoal-900">Mes tâches</h1>
                  <button className="btn-primary text-body-sm py-2.5">+ Ajouter une tâche</button>
                </div>
                <div className="bg-white rounded-2xl shadow-soft p-6">
                  <ul className="space-y-3">
                    {tasks.map((task) => (
                      <li key={task.id} className="flex items-center space-x-4 p-4 hover:bg-charcoal-50 rounded-xl transition-colors">
                        <button className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          task.done ? 'bg-rose-600 border-rose-600' : 'border-charcoal-300 hover:border-rose-400'
                        }`}>
                          {task.done && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <div className="flex-1">
                          <p className={`text-body-md ${task.done ? 'text-charcoal-400 line-through' : 'text-charcoal-900'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <div className="flex items-center text-caption text-charcoal-500">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {task.due}
                            </div>
                          </div>
                        </div>
                        <span className="text-caption px-3 py-1 bg-champagne-50 text-champagne-800 rounded-full">
                          {task.category}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'vendors' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-display-md text-charcoal-900">Mes prestataires</h1>
                  <Link href="/vendors" className="btn-primary text-body-sm py-2.5 flex items-center space-x-2">
                    <span>Chercher</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {savedVendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white rounded-2xl shadow-soft p-5 flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-heading-sm text-charcoal-900">{vendor.name}</h3>
                        <p className="text-body-sm text-charcoal-600">{vendor.category}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <div className="flex items-center text-caption text-champagne-700">
                            <Star className="w-3.5 h-3.5 mr-1 fill-champagne-600 text-champagne-600" />
                            {vendor.rating}
                          </div>
                          <span className="text-caption text-charcoal-600">Dès {vendor.price}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`text-caption px-3 py-1 rounded-full font-medium ${
                          vendor.status === 'Confirmé'
                            ? 'bg-green-50 text-green-700'
                            : vendor.status === 'En contact'
                            ? 'bg-champagne-50 text-champagne-800'
                            : 'bg-charcoal-100 text-charcoal-600'
                        }`}>
                          {vendor.status}
                        </span>
                        <Link href={`/vendors/${vendor.id}`} className="text-rose-600 text-caption hover:underline">
                          Voir le profil
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'budget' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-display-md text-charcoal-900">Mon budget</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-body-sm text-charcoal-600">Budget total</p>
                      <p className="font-display text-heading-xl text-charcoal-900">
                        {couple.budget.toLocaleString('fr-FR')}€
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm text-charcoal-600">Dépensé</p>
                      <p className="font-display text-heading-xl text-rose-600">
                        {couple.budgetSpent.toLocaleString('fr-FR')}€
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm text-charcoal-600">Restant</p>
                      <p className="font-display text-heading-xl text-green-600">
                        {(couple.budget - couple.budgetSpent).toLocaleString('fr-FR')}€
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-charcoal-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                  <p className="text-caption text-charcoal-500 mt-2">{budgetPercent}% du budget utilisé</p>
                </div>

                <div className="bg-white rounded-2xl shadow-soft p-6">
                  <h3 className="font-serif text-heading-md text-charcoal-900 mb-5">Par catégorie</h3>
                  <div className="space-y-4">
                    {budgetCategories.map((cat, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-body-md text-charcoal-900">{cat.name}</p>
                          <p className="text-body-sm text-charcoal-600">
                            {cat.spent.toLocaleString('fr-FR')}€ / {cat.allocated.toLocaleString('fr-FR')}€
                          </p>
                        </div>
                        <div className="w-full h-2 bg-charcoal-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cat.color}`}
                            style={{ width: `${Math.min((cat.spent / cat.allocated) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'messages' && (
              <div>
                <h1 className="font-display text-display-md text-charcoal-900 mb-6">Messages</h1>
                <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                  <ul className="divide-y divide-charcoal-100">
                    {messages.map((msg, i) => (
                      <li key={i} className="flex items-start space-x-4 p-5 hover:bg-charcoal-50 cursor-pointer transition-colors">
                        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="font-semibold text-rose-600">{msg.vendor.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-body-md font-medium ${msg.unread ? 'text-charcoal-900' : 'text-charcoal-700'}`}>
                              {msg.vendor}
                            </p>
                            <span className="text-caption text-charcoal-500">{msg.time}</span>
                          </div>
                          <p className="text-body-sm text-charcoal-600 truncate">{msg.preview}</p>
                        </div>
                        {msg.unread && (
                          <div className="w-2.5 h-2.5 bg-rose-600 rounded-full mt-1.5 flex-shrink-0" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
