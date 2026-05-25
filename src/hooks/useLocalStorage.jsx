import {useState} from "react";

function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);

            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setStoredValue = (newValue) => {
        try {
            setValue(newValue);

            // set(null) équivaut à supprimer
            if (newValue === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(newValue));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return [value, setStoredValue];
}

export default useLocalStorage;