'use server'

export async function getBCVRate() {
    try {
        const response = await fetch("https://bcvapi.tech/api/v1/dolar", {
            headers: {
                // In a real production app, this should be process.env.BCV_API_KEY
                // Using the provided key directly as requested for this specific implementation context
                'Authorization': 'sk_mWuhslyaVpaFEeB4MhgwU2hNBvSFTFvg'
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!response.ok) {
            console.error("BCV API Error:", response.status, response.statusText)
            return { success: false, error: "Failed to fetch rate" }
        }

        const data = await response.json()

        // Ensure we parse the rate correctly
        // The API returns { tasa: number, fecha: string }
        return {
            success: true,
            rate: data.tasa,
            date: data.fecha
        }

    } catch (error) {
        console.error("BCV Fetch Error:", error)
        return { success: false, error: "Network error" }
    }
}
