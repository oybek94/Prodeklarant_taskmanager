const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Yangi ishlar</div>
          <div className="text-2xl font-bold text-gray-800">-</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Tugallangan ishlar</div>
          <div className="text-2xl font-bold text-gray-800">-</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Jarayonlar statistikasi</div>
          <div className="text-2xl font-bold text-gray-800">-</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Ishchilar faoliyati</div>
          <div className="text-2xl font-bold text-gray-800">-</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Moliya statistikasi</div>
          <div className="text-2xl font-bold text-gray-800">-</div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Grafiklar</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Grafiklar joylashuvi (Daily/Weekly/Monthly)
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtrlash</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Sana</label>
              <input type="date" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Ishchi</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Barchasi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Mijoz</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Barchasi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Filial</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Barchasi</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

