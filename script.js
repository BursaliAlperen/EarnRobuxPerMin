const { useState, useEffect, useMemo, useCallback, useSyncExternalStore } = React;

// --- Websim Setup ---
const room = new WebsimSocket();

// --- Constants ---
const MIN_WITHDRAWAL = 20;
const EARN_INTERVAL_SECONDS = 60;
const BALANCE_RECORD_TYPE = 'balance_v1';
const REQUEST_RECORD_TYPE = 'request_v1';

// --- Hooks ---
function useCurrentUser() {
    const [user, setUser] = useState(null);
    useEffect(() => {
        window.websim.getCurrentUser().then(setUser);
    }, []);
    return user;
}

function useAdminStatus() {
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const checkAdmin = async () => {
            const currentUser = await window.websim.getCurrentUser();
            const creator = await window.websim.getCreatedBy();
            setIsAdmin(currentUser && creator && currentUser.username === creator.username);
        };
        checkAdmin();
    }, []);
    return isAdmin;
}

// --- Components ---
function AdminPage() {
    const requests = useSyncExternalStore(
        room.collection(REQUEST_RECORD_TYPE).subscribe,
        room.collection(REQUEST_RECORD_TYPE).getList
    );

    const handleAction = async (id, action) => {
        const result = await Swal.fire({
            title: 'Emin misiniz?',
            text: `Bu talebi "${action}" olarak işaretlemek üzeresiniz. Bu işlem geri alınamaz.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Evet, onayla!',
            cancelButtonText: 'İptal'
        });

        if (result.isConfirmed) {
            try {
                await room.collection(REQUEST_RECORD_TYPE).delete(id);
                Swal.fire('Başarılı!', 'Talep başarıyla işlendi.', 'success');
            } catch (error) {
                console.error('İşlem başarısız:', error);
                Swal.fire('Hata!', 'İşlem sırasında bir hata oluştu.', 'error');
            }
        }
    };

    return (
        <div className="admin-page">
            <div className="header"><h1><i className="fas fa-user-shield"></i> Admin Paneli</h1></div>
            <h2>Çekim Talepleri</h2>
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Kullanıcı Adı</th>
                            <th>Miktar (Robux)</th>
                            <th>Gamepass Adresi</th>
                            <th>Tarih</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>Bekleyen talep yok.</td></tr>
                        ) : (
                            requests.map(req => (
                                <tr key={req.id}>
                                    <td>
                                       <img src={`https://images.websim.com/avatar/${req.username}`} alt={req.username} style={{width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px', verticalAlign: 'middle'}} />
                                       {req.username}
                                    </td>
                                    <td>{req.amount}</td>
                                    <td><a href={req.gamepassUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>Link</a></td>
                                    <td>{new Date(req.created_at).toLocaleString()}</td>
                                    <td>
                                        <button onClick={() => handleAction(req.id, 'tamamla')} className="action-btn complete-btn" title="Tamamlandı olarak işaretle"><i className="fas fa-check"></i></button>
                                        <button onClick={() => handleAction(req.id, 'sil')} className="action-btn delete-btn" title="Talebi sil"><i className="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UserPage({ user }) {
    const userBalanceFilter = useMemo(() => ({ username: user.username }), [user.username]);
    const balanceRecords = useSyncExternalStore(
        room.collection(BALANCE_RECORD_TYPE).filter(userBalanceFilter).subscribe,
        room.collection(BALANCE_RECORD_TYPE).filter(userBalanceFilter).getList
    );

    const [balanceRecord, setBalanceRecord] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(EARN_INTERVAL_SECONDS);
    const [gamepassUrl, setGamepassUrl] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const balance = balanceRecord ? balanceRecord.balance : 0;

    useEffect(() => {
        const setupBalance = async () => {
            if (balanceRecords.length > 0) {
                setBalanceRecord(balanceRecords[0]);
            } else if (user?.username) {
                // If no record exists, check once more and then create if needed.
                const existing = room.collection(BALANCE_RECORD_TYPE).filter(userBalanceFilter).getList();
                if (existing.length === 0) {
                    const newRecord = await room.collection(BALANCE_RECORD_TYPE).create({ balance: 0 });
                    setBalanceRecord(newRecord);
                } else {
                    setBalanceRecord(existing[0]);
                }
            }
            if (user?.username) {
                setIsLoading(false);
            }
        };
        setupBalance();
    }, [balanceRecords, user, userBalanceFilter]);

    useEffect(() => {
        if (isLoading || !balanceRecord) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    const newBalance = (balanceRecord.balance || 0) + 1;
                    room.collection(BALANCE_RECORD_TYPE).update(balanceRecord.id, { balance: newBalance });
                    // The useSyncExternalStore will update the state, no need for setBalanceRecord here.
                    return EARN_INTERVAL_SECONDS;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isLoading, balanceRecord]);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        const amount = parseInt(withdrawAmount, 10);
        
        if (!gamepassUrl || !amount) {
            return Swal.fire('Eksik Bilgi', 'Lütfen tüm alanları doldurun.', 'warning');
        }
        if (!gamepassUrl.startsWith('https://www.roblox.com/')) {
             return Swal.fire('Geçersiz URL', 'Lütfen geçerli bir Roblox Gamepass URL\'si girin.', 'error');
        }
        if (amount < MIN_WITHDRAWAL) {
            return Swal.fire('Yetersiz Miktar', `Minimum çekim miktarı ${MIN_WITHDRAWAL} Robux.`, 'info');
        }
        if (amount > balance) {
            return Swal.fire('Yetersiz Bakiye', 'Çekmek istediğiniz miktar bakiyenizden fazla.', 'error');
        }

        try {
            await room.collection(REQUEST_RECORD_TYPE).create({
                amount: amount,
                gamepassUrl: gamepassUrl,
            });

            const newBalance = balance - amount;
            await room.collection(BALANCE_RECORD_TYPE).update(balanceRecord.id, { balance: newBalance });
            
            setGamepassUrl('');
            setWithdrawAmount('');

            Swal.fire('Başarılı!', 'Çekim talebiniz başarıyla alındı. En kısa sürede işleme alınacaktır.', 'success');
        } catch (error) {
            console.error("Çekim talebi oluşturulamadı:", error);
            Swal.fire('Hata!', 'Çekim talebi oluşturulurken bir hata oluştu.', 'error');
        }
    };
    
    if (isLoading) {
        return <div className="loader"><i className="fas fa-spinner fa-spin"></i> Yükleniyor...</div>;
    }

    const progress = ((EARN_INTERVAL_SECONDS - timeLeft) / EARN_INTERVAL_SECONDS) * 100;

    return (
        <div className="app-container">
            <div className="header">
                <h1><img src="/logo.png" alt="Robux Logo" /> Robux Kazan</h1>
                 <div className="user-info">
                     <img src={`https://images.websim.com/avatar/${user.username}`} alt="User Avatar"/>
                     <span>{user.username}</span>
                 </div>
            </div>

            <div className="main-content">
                <div className="left-panel">
                    <div className="card">
                        <h2><i className="fas fa-coins"></i> Bakiye ve Kazanma</h2>
                        <p>Mevcut Bakiyeniz:</p>
                        <div className="balance-display">{balance.toLocaleString()} Robux</div>
                        <div className="timer-display">
                            Sonraki 1 Robux için: <strong>{timeLeft} saniye</strong>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-bar-inner" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    
                    <div className="card">
                        <h2><i className="fas fa-paper-plane"></i> Çekim Talebi</h2>
                        <p>Minimum çekim miktarı: <strong>{MIN_WITHDRAWAL} Robux</strong></p>
                        <form onSubmit={handleWithdraw}>
                            <div className="form-group">
                                <label htmlFor="gamepassUrl">Gamepass Adresi</label>
                                <input 
                                    type="url" 
                                    id="gamepassUrl" 
                                    placeholder="https://www.roblox.com/game-pass/..." 
                                    value={gamepassUrl}
                                    onChange={e => setGamepassUrl(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="amount">Miktar</label>
                                <input 
                                    type="number" 
                                    id="amount" 
                                    placeholder="Çekilecek Robux miktarı" 
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    min={MIN_WITHDRAWAL}
                                    max={balance}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn" disabled={balance < MIN_WITHDRAWAL}>
                                Çekim Talebi Gönder
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function App() {
    const user = useCurrentUser();
    const isAdmin = useAdminStatus();
    
    const [page, setPage] = useState('user'); // 'user' or 'admin'

    useEffect(() => {
        const path = window.location.pathname;
        if (path.endsWith('/admin') && isAdmin) {
            setPage('admin');
        } else {
            setPage('user');
        }
    }, [isAdmin]);

    if (!user) {
        return <div className="loader"><i className="fas fa-spinner fa-spin"></i> Kullanıcı bilgileri yükleniyor...</div>;
    }

    return (
        <>
            {isAdmin && (
                 <div className="admin-nav">
                    {page === 'admin' ? (
                        <a href="./"><i className="fas fa-home"></i> Ana Sayfa</a>
                    ) : (
                        <a href="./admin"><i className="fas fa-user-shield"></i> Admin Paneli</a>
                    )}
                </div>
            )}
            {page === 'admin' && isAdmin ? <AdminPage /> : <UserPage user={user} />}
        </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);