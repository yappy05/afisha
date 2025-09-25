package com.example.afishaapkandroid


import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            val webView = WebView(this)
            setContentView(webView)
            webView.settings.javaScriptEnabled = true
            webView.loadUrl("https://google.com")
        } catch (e: Exception) {
        }
    }
}