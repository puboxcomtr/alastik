// /apps/admin/src/app/[lang]/(dashboard)/(private)/dashboards/ecommerce/page.tsx

export const metadata = {
    title: "Yönetici Paneli - Türkiye'nin En Yaygın Lastikçisi",
    description: 'ALastik Yönetim Paneli'
}

const EcommerceDashboard = () => {
    return (
        <div className='p-6'>
            <h1 className='text-2xl font-bold mb-4'>ALastik Dashboard</h1>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                <div className='p-6 bg-white rounded-lg shadow'>
                    <h3 className='text-gray-500 text-sm'>Toplam Ürün</h3>
                    <p className='text-3xl font-bold mt-2'>1,234</p>
                </div>
                <div className='p-6 bg-white rounded-lg shadow'>
                    <h3 className='text-gray-500 text-sm'>Toplam Kategori</h3>
                    <p className='text-3xl font-bold mt-2'>45</p>
                </div>
                <div className='p-6 bg-white rounded-lg shadow'>
                    <h3 className='text-gray-500 text-sm'>Toplam Marka</h3>
                    <p className='text-3xl font-bold mt-2'>78</p>
                </div>
                <div className='p-6 bg-white rounded-lg shadow'>
                    <h3 className='text-gray-500 text-sm'>Aktif Ürünler</h3>
                    <p className='text-3xl font-bold mt-2'>987</p>
                </div>
            </div>
        </div>
    )
}

export default EcommerceDashboard