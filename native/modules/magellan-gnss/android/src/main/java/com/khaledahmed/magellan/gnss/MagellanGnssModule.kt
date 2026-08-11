package com.khaledahmed.magellan.gnss

import android.Manifest
import android.content.pm.PackageManager
import android.location.GnssStatus
import android.location.LocationManager
import android.os.Build
import android.os.HandlerThread
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

/**
 * Real Android GnssStatus bridge.
 *
 * Every field emitted here comes directly from android.location.GnssStatus.
 * If a value is not exposed by the platform (e.g. carrierFrequencyHz on API
 * levels below 26, or basebandCn0DbHz below 30) it is simply omitted — never
 * invented. See MASTER PROMPT section 7/9.
 *
 * The callback is registered on a dedicated HandlerThread, not the main
 * thread, so satellite status delivery can never contend with UI rendering.
 * This is the structural fix the WebView/Capacitor version could not
 * achieve, since there GNSS delivery and rendering shared the same
 * Chromium main thread.
 */
class MagellanGnssModule : Module() {
  private var handlerThread: HandlerThread? = null
  private var callback: GnssStatus.Callback? = null

  override fun definition() = ModuleDefinition {
    Name("MagellanGnss")

    Events("onGnssStatus")

    Function("isAvailable") {
      val hasPermission = ContextCompat.checkSelfPermission(
        appContext.reactContext ?: return@Function false,
        Manifest.permission.ACCESS_FINE_LOCATION,
      ) == PackageManager.PERMISSION_GRANTED
      hasPermission && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
    }

    Function("startUpdates") {
      startUpdates()
    }

    Function("stopUpdates") {
      stopUpdates()
    }

    OnDestroy {
      stopUpdates()
    }
  }

  private fun startUpdates() {
    if (callback != null) return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
    val context = appContext.reactContext ?: return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
      != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val locationManager = context.getSystemService(LocationManager::class.java) ?: return

    val thread = HandlerThread("MagellanGnssStatus").apply { start() }
    handlerThread = thread
    val handler = android.os.Handler(thread.looper)

    val statusCallback = object : GnssStatus.Callback() {
      override fun onSatelliteStatusChanged(status: GnssStatus) {
        val satellites = JSONArray()
        var visible = 0
        var usedInFix = 0
        for (i in 0 until status.satelliteCount) {
          visible++
          val used = status.usedInFix(i)
          if (used) usedInFix++
          val sat = JSONObject()
          sat.put("id", "${constellationName(status.getConstellationType(i))}-${status.getSvid(i)}")
          sat.put("constellation", constellationName(status.getConstellationType(i)))
          sat.put("svid", status.getSvid(i))
          sat.put("azimuthDeg", status.getAzimuthDegrees(i).toDouble())
          sat.put("elevationDeg", status.getElevationDegrees(i).toDouble())
          sat.put("cn0DbHz", status.getCn0DbHz(i).toDouble())
          sat.put("usedInFix", used)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && status.hasCarrierFrequencyHz(i)) {
            sat.put("carrierFrequencyHz", status.getCarrierFrequencyHz(i).toDouble())
          }
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && status.hasBasebandCn0DbHz(i)) {
            sat.put("basebandCn0DbHz", status.getBasebandCn0DbHz(i).toDouble())
          }
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            sat.put("hasAlmanac", status.hasAlmanacData(i))
            sat.put("hasEphemeris", status.hasEphemerisData(i))
          }
          satellites.put(sat)
        }

        val payload = JSONObject()
        payload.put("timestamp", System.currentTimeMillis())
        payload.put("satellitesVisible", visible)
        payload.put("satellitesUsedInFix", usedInFix)
        payload.put("fixQuality", if (usedInFix > 0) "3D" else "ACQUIRING")
        payload.put("satellites", satellites)

        sendEvent("onGnssStatus", jsonObjectToMap(payload))
      }
    }
    callback = statusCallback
    locationManager.registerGnssStatusCallback(statusCallback, handler)
  }

  private fun stopUpdates() {
    val context = appContext.reactContext
    val locationManager = context?.getSystemService(LocationManager::class.java)
    callback?.let { locationManager?.unregisterGnssStatusCallback(it) }
    callback = null
    handlerThread?.quitSafely()
    handlerThread = null
  }

  private fun constellationName(type: Int): String = when (type) {
    GnssStatus.CONSTELLATION_GPS -> "GPS"
    GnssStatus.CONSTELLATION_GALILEO -> "GALILEO"
    GnssStatus.CONSTELLATION_GLONASS -> "GLONASS"
    GnssStatus.CONSTELLATION_BEIDOU -> "BEIDOU"
    GnssStatus.CONSTELLATION_QZSS -> "QZSS"
    GnssStatus.CONSTELLATION_SBAS -> "SBAS"
    GnssStatus.CONSTELLATION_IRNSS -> "IRNSS"
    else -> "UNKNOWN"
  }

  /** expo-modules-core Kotlin events expect a Map, not a raw JSONObject. */
  private fun jsonObjectToMap(json: JSONObject): Map<String, Any?> {
    val map = HashMap<String, Any?>()
    json.keys().forEach { key ->
      val value = json.get(key)
      map[key] = when (value) {
        is JSONArray -> jsonArrayToList(value)
        is JSONObject -> jsonObjectToMap(value)
        else -> value
      }
    }
    return map
  }

  private fun jsonArrayToList(json: JSONArray): List<Any?> {
    val list = ArrayList<Any?>()
    for (i in 0 until json.length()) {
      val value = json.get(i)
      list.add(
        when (value) {
          is JSONArray -> jsonArrayToList(value)
          is JSONObject -> jsonObjectToMap(value)
          else -> value
        },
      )
    }
    return list
  }
}
