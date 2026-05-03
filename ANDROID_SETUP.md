# Android Studio Setup for MentorMind (Mobile Edition)

To successfully port MentorMind to Android as a high-performance web-wrapped application, follow these precise steps.

## 1. Project Initialization
- **Action**: File > New > New Project
- **Template**: **Empty Views Activity**
- **Settings**:
    - **Name**: MentorMind
    - **Package Name**: `com.marav.mentormind`
    - **Save Location**: Select your preferred directory.
    - **Language**: **Kotlin**
    - **Minimum SDK**: **API 24: Android 7.0 (Nougat)** or higher.

## 2. UI Layout (`activity_main.xml`)
Replace `res/layout/activity_main.xml` to include a polished progress indicator.

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@android:color/black"
    tools:context=".MainActivity">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:visibility="invisible" />

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="8dp"
        android:indeterminate="false"
        android:progress="0"
        app:layout_constraintTop_toTopOf="parent" />

    <ImageView
        android:id="@+id/splashLogo"
        android:layout_width="120dp"
        android:layout_height="120dp"
        android:src="@mipmap/ic_launcher_round"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
```

## 3. Core Logic (`MainActivity.kt`)
Replace `MainActivity.kt` with this modernized implementation using `OnBackPressedCallback`.

```kotlin
package com.marav.mentormind

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.ImageView
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var splashLogo: ImageView
    
    // CRITICAL: Replace with your production URL from AI Studio Share settings
    private val appUrl = "https://mentor-mind-marav.web.app" 

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        splashLogo = findViewById(R.id.splashLogo)

        // Handle Back Navigation efficiently
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        setupWebView()
        webView.loadUrl(appUrl)
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                // Fade out splash and show content
                splashLogo.animate().alpha(0f).setDuration(500).withEndAction {
                    splashLogo.visibility = View.GONE
                    webView.visibility = View.VISIBLE
                    webView.animate().alpha(1f).duration = 300
                }
                progressBar.visibility = View.GONE
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress > 80) splashLogo.animate().alpha(0.5f).duration = 200
            }

            // Required for Microphone and Camera features in WebView
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }
    }
}
```

## 4. Manifest (`AndroidManifest.xml`)
Grant the app the necessary neural link (Internet and Audio).

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## 5. Final Step: Deployment
Ensure your app is deployed via Firebase or Vercel. In Android Studio, use **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate your first testable file.
