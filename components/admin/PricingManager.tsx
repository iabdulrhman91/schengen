"use client";

import { useState, useEffect } from "react";
import { PriceBook, PriceOverride, Country, Location } from "@/lib/storage/types";
import { getAdminPricingData, createCountryAction, updateCountryAction, createLocationAction, updateLocationAction, createPriceBookAction, updatePriceBookAction, deletePriceBookAction, createPriceOverrideAction, updatePriceOverrideAction, deletePriceOverrideAction } from "@/lib/actions";
import { Button } from "@/components/ui/core";
import { Loader2, Plus, CheckCircle2, XCircle, MapPin, Globe, CreditCard, Tag, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

// --- Types ---
type Tab = 'COUNTRIES' | 'CENTERS' | 'BOOKS' | 'OVERRIDES';

export function PricingManager() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        priceBooks: PriceBook[],
        overrides: PriceOverride[],
        countries: Country[],
        locations: Location[]
    } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('COUNTRIES');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
    const [currentItem, setCurrentItem] = useState<any>(null); // Generic for now
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getAdminPricingData();
            // @ts-ignore
            setData(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setModalMode('ADD');
        setCurrentItem({});
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setModalMode('EDIT');
        setCurrentItem(item);
        setIsModalOpen(true);
    };

    // PREPARE DATA FOR BACKEND
    const prepareCountryForSave = (item: any) => {
        return {
            ...item,
            // Ensure strict ISO/Emoji separation
            iso_code: item.iso_code ? item.iso_code.toUpperCase() : undefined,
            code: item.iso_code ? item.iso_code.toUpperCase() : `C-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        };
    };

    const preparePriceBookForSave = (item: any) => {
        const country = data?.countries.find(c => c.id === item.countryId);
        const location = data?.locations.find(l => l.id === item.locationId);

        // Auto-generate name if not provided
        const autoName = `${country?.name_ar || 'Unknown'} - ${location?.name_ar || 'عام'} - ${new Date().getFullYear()}`;

        return {
            countryId: item.countryId,
            locationId: item.locationId || undefined, // Send undefined if empty string
            name: item.name || autoName,
            currency: 'SAR', // Fixed for now
            is_active: item.is_active ?? true,
            is_default_for_country: !!item.is_default_for_country,

            // Prices
            normal_adult_price: Number(item.normal_adult_price) || 0,
            normal_child_price: Number(item.normal_child_price) || 0,
            normal_infant_price: Number(item.normal_infant_price) || 0,

            vip_adult_price: Number(item.vip_adult_price) || 0,
            vip_child_price: Number(item.vip_child_price) || 0,
            vip_infant_price: Number(item.vip_infant_price) || 0,
        };
    };

    const preparePriceOverrideForSave = (item: any) => {
        return {
            countryId: item.countryId,
            locationId: item.locationId, // Required for City Override
            scope: 'CITY',

            modifierType: item.modifierType,
            value: Number(item.value),

            seatType: item.seatType,
            passengerType: item.passengerType,

            is_active: item.is_active ?? true,
        };
    };

    // HARDENED SAVE HANDLER
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let res;
            if (activeTab === 'COUNTRIES') {
                const payload = prepareCountryForSave(currentItem);
                if (modalMode === 'ADD') {
                    res = await createCountryAction(payload);
                } else {
                    res = await updateCountryAction(currentItem.id, payload);
                }
            } else if (activeTab === 'CENTERS') {
                if (modalMode === 'ADD') {
                    res = await createLocationAction(currentItem.name_ar);
                } else {
                    res = await updateLocationAction(currentItem.id, { name_ar: currentItem.name_ar, is_active: currentItem.is_active });
                }
            } else if (activeTab === 'BOOKS') {
                const payload = preparePriceBookForSave(currentItem);
                if (modalMode === 'ADD') {
                    res = await createPriceBookAction(payload);
                } else {
                    res = await updatePriceBookAction(currentItem.id, payload);
                }
            } else if (activeTab === 'OVERRIDES') {
                const payload = preparePriceOverrideForSave(currentItem);
                if (modalMode === 'ADD') {
                    res = await createPriceOverrideAction(payload);
                } else {
                    res = await updatePriceOverrideAction(currentItem.id, payload);
                }
            }

            if (res && res.success) {
                setIsModalOpen(false);
                await loadData();
                router.refresh();
                alert('✅ تم الحفظ بنجاح');
            } else {
                alert('❌ فشلت العملية: ' + (res?.error || 'خطأ غير معروف'));
            }
        } catch (err: any) {
            console.error(err);
            alert('❌ خطأ في النظام: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Toggle Status Helper
    const toggleStatus = async (item: any, type: 'COUNTRY' | 'LOCATION' | 'PRICEBOOK' | 'OVERRIDE') => {
        if (!confirm('هل أنت متأكد من تغيير الحالة؟')) return;
        if (type === 'COUNTRY') await updateCountryAction(item.id, { is_active: !item.is_active });
        if (type === 'LOCATION') await updateLocationAction(item.id, { is_active: !item.is_active });
        if (type === 'PRICEBOOK') await updatePriceBookAction(item.id, { is_active: !item.is_active });
        if (type === 'OVERRIDE') await updatePriceOverrideAction(item.id, { is_active: !item.is_active });
        loadData();
    };

    const handleDelete = async (id: string, type: 'PRICEBOOK' | 'OVERRIDE') => {
        if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه العملية.')) return;
        if (type === 'PRICEBOOK') await deletePriceBookAction(id);
        if (type === 'OVERRIDE') await deletePriceOverrideAction(id);
        loadData();
    };

    // Render Flag Helper (Matching Appointments Page Strategy)
    const renderFlag = (c: Country) => {
        // 1. CSS Flag (Best Quality)
        if (c.iso_code) {
            // Basic sanitation for ISO code
            const iso = c.iso_code.toLowerCase();
            return <span className={`fi fi-${iso} text-3xl rounded shadow-sm inline-block`} title={iso} />;
        }

        // 2. Image URL (Legacy)
        if (c.flag_image_url) {
            return <img src={c.flag_image_url} alt="flag" className="w-8 h-5 object-cover rounded shadow-sm inline-block" />;
        }

        // 3. Emoji (Fallback)
        if (c.flag_emoji && !c.flag_emoji.includes('<')) {
            return <span className="text-3xl">{c.flag_emoji}</span>;
        }

        // 4. Default
        return <span className="text-xl grayscale opacity-30">🌍</span>;
    };

    if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;
    if (!data) return <div className="p-8 text-red-500">فشل تحميل البيانات</div>;

    const tabs = [
        { id: 'COUNTRIES', label: 'الدول', icon: Globe },
        { id: 'CENTERS', label: 'المراكز', icon: MapPin },
        { id: 'BOOKS', label: 'قوائم الأسعار', icon: CreditCard },
        { id: 'OVERRIDES', label: 'التعديلات والعروض', icon: Tag },
    ];

    return (
        <div className="space-y-6 relative" dir="rtl">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">إدارة الكتالوج والأسعار</h1>
                    <p className="text-sm text-gray-500">التحكم المركزي بالدول، المراكز، والخطط السعرية</p>
                </div>
                <Button onClick={handleOpenAdd}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة {activeTab === 'COUNTRIES' ? 'دولة' : activeTab === 'CENTERS' ? 'مركز' : activeTab === 'BOOKS' ? 'قائمة أسعار' : 'تعديل سعري'}
                </Button>
            </div>

            {/* TABS */}
            <div className="border-b flex items-center gap-6 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TABLE CONTENT */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden min-h-[400px]">

                {/* 1. COUNTRIES */}
                {activeTab === 'COUNTRIES' && (
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-medium text-gray-600 w-16 text-center">العلم</th>
                                <th className="p-3 font-medium text-gray-600">الاسم (عربي)</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الحالة</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.countries.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-center">
                                        {renderFlag(c)}
                                    </td>
                                    <td className="p-3 font-bold text-gray-800">{c.name_ar}</td>
                                    <td className="p-3 cursor-pointer" onClick={() => toggleStatus(c, 'COUNTRY')}>
                                        {c.is_active
                                            ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-medium">نشط</span>
                                            : <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">مخفي</span>
                                        }
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => handleOpenEdit(c)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* 2. CENTERS */}
                {activeTab === 'CENTERS' && (
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-medium text-gray-600">اسم المركز</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الحالة</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.locations.map(l => (
                                <tr key={l.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-gray-800">{l.name_ar}</td>
                                    <td className="p-3 cursor-pointer" onClick={() => toggleStatus(l, 'LOCATION')}>
                                        {l.is_active
                                            ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-medium">نشط</span>
                                            : <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">مخفي</span>
                                        }
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => handleOpenEdit(l)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* 3. BOOKS */}
                {activeTab === 'BOOKS' && (
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-medium text-gray-600">القائمة</th>
                                <th className="p-3 font-medium text-gray-600">الدولة / المركز</th>
                                <th className="p-3 font-medium text-gray-600">طبيعة القائمة</th>
                                <th className="p-3 font-medium text-gray-600">عادي (بالغ)</th>
                                <th className="p-3 font-medium text-gray-600">VIP (بالغ)</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الحالة</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.priceBooks.map(pb => {
                                const country = data.countries.find(c => c.id === pb.countryId);
                                const location = data.locations.find(l => l.id === pb.locationId);
                                return (
                                    <tr key={pb.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-bold text-gray-800">{pb.name}</td>
                                        <td className="p-3 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                {country && renderFlag(country)}
                                                <span>{country?.name_ar}</span>
                                                {location && <span className="text-xs text-gray-400">({location.name_ar})</span>}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {pb.is_default_for_country
                                                ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200">افتراضي</span>
                                                : <span className="text-gray-500 text-xs">مخصصة</span>
                                            }
                                        </td>
                                        <td className="p-3 tabular-nums font-medium">{pb.normal_adult_price}</td>
                                        <td className="p-3 tabular-nums font-medium text-amber-600">{pb.vip_adult_price}</td>
                                        <td className="p-3 cursor-pointer" onClick={() => toggleStatus(pb, 'PRICEBOOK')}>
                                            {pb.is_active
                                                ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-medium">نشط</span>
                                                : <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">مخفي</span>
                                            }
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => handleOpenEdit(pb)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(pb.id, 'PRICEBOOK')} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* 4. OVERRIDES */}
                {activeTab === 'OVERRIDES' && (
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-medium text-gray-600">نوع التعديل</th>
                                <th className="p-3 font-medium text-gray-600">المكان المستهدف</th>
                                <th className="p-3 font-medium text-gray-600">النطاق (الفئات)</th>
                                <th className="p-3 font-medium text-gray-600">القيمة</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الحالة</th>
                                <th className="p-3 font-medium text-gray-600 w-24">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.overrides.filter(o => o.scope === 'CITY').map(o => {
                                const country = data.countries.find(c => c.id === o.countryId);
                                const location = data.locations.find(l => l.id === o.locationId);
                                return (
                                    <tr key={o.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-bold text-gray-800">
                                            {o.modifierType === 'FIXED_PRICE' ? 'سعر ثابت' :
                                                o.modifierType === 'DISCOUNT_AMOUNT' ? 'خصم (مبلغ)' : 'خصم (%)'}
                                        </td>
                                        <td className="p-3 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                {country && renderFlag(country)}
                                                <span className="font-medium text-gray-900">{country?.name_ar}</span>
                                                <span className="text-gray-400">←</span>
                                                <span className="text-blue-700 font-bold">{location?.name_ar}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs text-gray-500">
                                            <div>الدرجة: {o.seatType === 'ALL' ? 'الكل' : o.seatType}</div>
                                            <div>المسافر: {o.passengerType === 'ALL' ? 'الكل' : o.passengerType}</div>
                                        </td>
                                        <td className="p-3 font-bold text-lg tabular-nums">
                                            {o.value}
                                            <span className="text-xs font-normal text-gray-400 mr-1">
                                                {o.modifierType === 'DISCOUNT_PERCENT' ? '%' : 'SAR'}
                                            </span>
                                        </td>
                                        <td className="p-3 cursor-pointer" onClick={() => toggleStatus(o, 'OVERRIDE')}>
                                            {o.is_active
                                                ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-medium">نشط</span>
                                                : <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">مخفي</span>
                                            }
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            <button onClick={() => handleOpenEdit(o)} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(o.id, 'OVERRIDE')} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className={`bg-white rounded-xl shadow-2xl w-full ${activeTab === 'BOOKS' || activeTab === 'OVERRIDES' ? 'max-w-2xl' : 'max-w-sm'} overflow-hidden border`}>
                        <div className="bg-gray-50 px-6 py-4 border-b">
                            <h3 className="text-lg font-bold text-gray-800">
                                {modalMode === 'ADD' ? 'إضافة جديد' : 'تعديل بيانات'}
                            </h3>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {activeTab === 'COUNTRIES' && (
                                <>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-1.5 block">اسم الدولة (بالعربي)</label>
                                        <input required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={currentItem?.name_ar || ''}
                                            onChange={e => setCurrentItem({ ...currentItem, name_ar: e.target.value })}
                                            placeholder="مثال: فرنسا"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-1.5 block">رمز الدولة (ISO)</label>
                                        <input required className="w-full border border-gray-300 rounded-lg p-3 font-mono uppercase text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={currentItem?.iso_code || ''}
                                            onChange={e => setCurrentItem({ ...currentItem, iso_code: e.target.value })}
                                            placeholder="FR" maxLength={2}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">يُستخدم لتوليد العلم تلقائياً</p>
                                    </div>
                                </>
                            )}

                            {activeTab === 'CENTERS' && (
                                <>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 mb-1.5 block">اسم المركز (بالعربي)</label>
                                        <input required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={currentItem?.name_ar || ''}
                                            onChange={e => setCurrentItem({ ...currentItem, name_ar: e.target.value })}
                                            placeholder="مثال: الرياض - السليمانية"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'BOOKS' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">الدولة</label>
                                            <select required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={currentItem?.countryId || ''}
                                                onChange={e => setCurrentItem({ ...currentItem, countryId: e.target.value })}
                                            >
                                                <option value="">اختر الدولة...</option>
                                                {data?.countries.filter(c => c.is_active).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">المركز (اختياري)</label>
                                            <select className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={currentItem?.locationId || ''}
                                                onChange={e => setCurrentItem({ ...currentItem, locationId: e.target.value })}
                                            >
                                                <option value="">عام لجميع المراكز</option>
                                                {data?.locations.filter(l => l.is_active).map(l => (
                                                    <option key={l.id} value={l.id}>{l.name_ar}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {!currentItem?.locationId && (
                                        <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <input type="checkbox" id="is_default" className="w-4 h-4 text-blue-600 rounded"
                                                checked={!!currentItem?.is_default_for_country}
                                                onChange={e => setCurrentItem({ ...currentItem, is_default_for_country: e.target.checked })}
                                            />
                                            <label htmlFor="is_default" className="text-sm font-medium text-blue-900 cursor-pointer">
                                                تعيين كقائمة افتراضية لهذه الدولة؟
                                            </label>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-8 border-t pt-4">
                                        {/* NORMAL */}
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-gray-800 text-sm border-b pb-2 mb-2">أسعار العادي (Normal)</h4>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">بالغ</label>
                                                <input type="number" required className="w-full border rounded p-2 text-sm" placeholder="0"
                                                    value={currentItem?.normal_adult_price || ''}
                                                    onChange={e => setCurrentItem({ ...currentItem, normal_adult_price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">طفل</label>
                                                <input type="number" required className="w-full border rounded p-2 text-sm" placeholder="0"
                                                    value={currentItem?.normal_child_price || ''}
                                                    onChange={e => setCurrentItem({ ...currentItem, normal_child_price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">رضيع</label>
                                                <input type="number" required className="w-full border rounded p-2 text-sm" placeholder="0"
                                                    value={currentItem?.normal_infant_price || ''}
                                                    onChange={e => setCurrentItem({ ...currentItem, normal_infant_price: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* VIP */}
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-amber-800 text-sm border-b pb-2 mb-2 border-amber-100">أسعار VIP</h4>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">بالغ</label>
                                                <input type="number" required className="w-full border border-amber-200 bg-amber-50 rounded p-2 text-sm" placeholder="0"
                                                    value={currentItem?.vip_adult_price || ''}
                                                    onChange={e => setCurrentItem({ ...currentItem, vip_adult_price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">طفل</label>
                                                <input type="number" required className="w-full border border-amber-200 bg-amber-50 rounded p-2 text-sm" placeholder="0"
                                                    value={currentItem?.vip_child_price || ''}
                                                    onChange={e => setCurrentItem({ ...currentItem, vip_child_price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">رضيع</label>
                                                <input type="number" required className="w-full border border-amber-200 bg-amber-50 rounded p-2 text-sm" placeholder="0"
                                                    value={currentItem?.vip_infant_price || ''}
                                                    onChange={e => setCurrentItem({ ...currentItem, vip_infant_price: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'OVERRIDES' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">الدولة</label>
                                            <select required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={currentItem?.countryId || ''}
                                                onChange={e => setCurrentItem({ ...currentItem, countryId: e.target.value })}
                                            >
                                                <option value="">اختر الدولة...</option>
                                                {data?.countries.filter(c => c.is_active).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">المركز <span className="text-red-500 text-xs">(مطلوب)</span></label>
                                            <select required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={currentItem?.locationId || ''}
                                                onChange={e => setCurrentItem({ ...currentItem, locationId: e.target.value })}
                                            >
                                                <option value="">اختر المركز...</option>
                                                {data?.locations.filter(l => l.is_active).map(l => (
                                                    <option key={l.id} value={l.id}>{l.name_ar}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
                                        <h4 className="font-bold text-orange-900 text-sm mb-3">تفاصيل التعديل</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">نوع التعديل</label>
                                                <select className="w-full border rounded p-2 text-sm bg-white"
                                                    value={currentItem?.modifierType || 'FIXED_PRICE'}
                                                    onChange={e => setCurrentItem({ ...currentItem, modifierType: e.target.value })}
                                                >
                                                    <option value="FIXED_PRICE">سعر ثابت</option>
                                                    <option value="DISCOUNT_AMOUNT">خصم (مبلغ)</option>
                                                    <option value="DISCOUNT_PERCENT">خصم (نسبة)</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">القيمة</label>
                                                <input type="number" required className="w-full border rounded p-2 text-sm" placeholder="مثال: 50 أو 1500"
                                                    value={currentItem?.value || ''}
                                                    onChange={e => setCurrentItem({ ...currentItem, value: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">يشمل المقاعد:</label>
                                            <select className="w-full border border-gray-300 rounded-lg p-3 outline-none bg-white"
                                                value={currentItem?.seatType || 'ALL'}
                                                onChange={e => setCurrentItem({ ...currentItem, seatType: e.target.value })}
                                            >
                                                <option value="ALL">الكل (عادي + VIP)</option>
                                                <option value="NORMAL">عادي فقط</option>
                                                <option value="VIP">VIP فقط</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-gray-700 mb-1.5 block">يشمل المسافرين:</label>
                                            <select className="w-full border border-gray-300 rounded-lg p-3 outline-none bg-white"
                                                value={currentItem?.passengerType || 'ALL'}
                                                onChange={e => setCurrentItem({ ...currentItem, passengerType: e.target.value })}
                                            >
                                                <option value="ALL">الكل</option>
                                                <option value="ADULT">بالغين</option>
                                                <option value="CHILD">أطفال</option>
                                                <option value="INFANT">رضع</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                                <Button type="submit" disabled={saving} className="min-w-[100px] font-bold">
                                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'حفظ البيانات'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
