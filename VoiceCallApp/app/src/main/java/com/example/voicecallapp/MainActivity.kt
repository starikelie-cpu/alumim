// Version: 1.0.0
package com.example.voicecallapp

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.widget.Button

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val btnBackground = findViewById<Button>(R.id.btnBackground)
        btnBackground.setOnClickListener {
            // Start foreground service for voice listening
            val serviceIntent = Intent(this, VoiceService::class.java)
            startForegroundService(serviceIntent)
        }
    }
}
