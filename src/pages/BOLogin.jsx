import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function BOLogin() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('admin@gmail.com');
    const [password, setPassword] = useState('admin123');

    const checkCredentials = (email, password) => {
        if (email === 'admin@gmail.com' && password === 'admin123') {
            return true;
        }
        return false;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (checkCredentials(email, password)) {
            localStorage.setItem('boAuth', 'true');
            navigate('/orders', { replace: true });
        } else {
            alert('Email ou mot de passe incorrect.');
        }
    }

    return (
        <div className="bo-login">
            <header className="bo-login__header">
                <span className="bo-login__eyebrow">Espace administrateur</span>
                <h1 className="bo-login__title">Connexion</h1>
                <p className="bo-login__subtitle">Authentifiez-vous pour accéder au backoffice.</p>
            </header>

            <form className="bo-login__form" onSubmit={handleSubmit}>
                <label className="bo-field">
                    <span className="bo-field__label">Adresse email</span>
                    <input
                        type="text"
                        placeholder="vous@exemple.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </label>

                <label className="bo-field">
                    <span className="bo-field__label">Mot de passe</span>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </label>

                <button type="submit" className="bo-btn--primary bo-btn--block">
                    Se connecter
                </button>
            </form>

            <p className="bo-login__footer">Backoffice — usage interne</p>
        </div>
    );
}

export default BOLogin;
