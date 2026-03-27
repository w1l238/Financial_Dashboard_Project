/**
 * C++ Compute Engine for Financial Technical Indicators.
 * Date: March 14, 2026 | Updated: March 23, 2026
 * Description: Implements SMA, RSI, EMA, Bollinger Bands, and MACD calculations
 *              for high-performance data processing. All functions are bound to
 *              Python via pybind11.
 */

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <vector>
#include <numeric>
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace py = pybind11;
using namespace pybind11::literals;

/**
 * Calculates the Simple Moving Average (SMA) over a given period.
 * Uses an efficient sliding-window technique: O(n) instead of O(n*period).
 */
std::vector<double> calculate_sma(const std::vector<double>& data, int period) {
    if (data.size() < (size_t)period) return {};

    std::vector<double> result;
    result.reserve(data.size() - period + 1);

    double sum = std::accumulate(data.begin(), data.begin() + period, 0.0);
    result.push_back(sum / period);

    for (size_t i = period; i < data.size(); ++i) {
        sum += data[i] - data[i - period];
        result.push_back(sum / period);
    }

    return result;
}

/**
 * Calculates the Relative Strength Index (RSI) over a given period.
 * Uses Wilder's smoothing method (the industry standard).
 * First `period` values are set to 50.0 as neutral placeholders.
 */
std::vector<double> calculate_rsi(const std::vector<double>& data, int period) {
    if (data.size() <= (size_t)period) return {};

    std::vector<double> rsi_values;
    rsi_values.reserve(data.size());

    // Initial placeholders for periods where RSI cannot be calculated
    for (int i = 0; i < period; ++i) rsi_values.push_back(50.0);

    double avg_gain = 0.0;
    double avg_loss = 0.0;

    // Seed the initial average gain/loss from the first `period` price changes
    for (int i = 1; i <= period; ++i) {
        double diff = data[i] - data[i - 1];
        if (diff >= 0) avg_gain += diff;
        else avg_loss -= diff;
    }

    avg_gain /= period;
    avg_loss /= period;

    auto calculate_step = [&](double gain, double loss) {
        if (loss == 0) return 100.0;
        double rs = gain / loss;
        return 100.0 - (100.0 / (1.0 + rs));
    };

    rsi_values.push_back(calculate_step(avg_gain, avg_loss));

    // Wilder's smoothing: exponentially weight each subsequent gain/loss (ref: https://tulipindicators.org/wilders)
    for (size_t i = period + 1; i < data.size(); ++i) {
        double diff = data[i] - data[i - 1];
        double current_gain = diff >= 0 ? diff : 0.0;
        double current_loss = diff < 0 ? -diff : 0.0;

        avg_gain = (avg_gain * (period - 1) + current_gain) / period;
        avg_loss = (avg_loss * (period - 1) + current_loss) / period;

        rsi_values.push_back(calculate_step(avg_gain, avg_loss));
    }

    return rsi_values;
}

/**
 * Calculates the Exponential Moving Average (EMA) over a given period.
 * The first value is seeded as the first price in the series.
 * multiplier = 2 / (period + 1), applied as: EMA = price * mult + prev_EMA * (1 - mult)
 * Returns a vector of the same length as the input data.
 */
std::vector<double> calculate_ema(const std::vector<double>& data, int period) {
    if (data.empty() || period <= 0) return {};

    std::vector<double> result;
    result.reserve(data.size());

    double multiplier = 2.0 / (period + 1.0);

    // Seed: first EMA value = first price
    double ema = data[0];
    result.push_back(ema);

    // Apply exponential weighting for all subsequent prices
    for (size_t i = 1; i < data.size(); ++i) {
        ema = (data[i] - ema) * multiplier + ema;
        result.push_back(ema);
    }

    return result;
}

/**
 * Calculates Bollinger Bands over a given period and standard deviation multiplier.
 * Returns a Python dict with keys "upper", "middle", "lower".
 * Each band has (data.size() - period + 1) values, aligned to the end of the data.
 *   middle = SMA(period)
 *   upper  = SMA + std_dev_mult * σ(period)
 *   lower  = SMA - std_dev_mult * σ(period)
 */
py::dict calculate_bollinger_bands(const std::vector<double>& data, int period, double std_dev_mult) {
    if (data.size() < (size_t)period) {
        return py::dict(
            "upper"_a = std::vector<double>{},
            "middle"_a = std::vector<double>{},
            "lower"_a = std::vector<double>{}
        );
    }

    size_t n = data.size() - period + 1;
    std::vector<double> upper, middle, lower;
    upper.reserve(n);
    middle.reserve(n);
    lower.reserve(n);

    // Sliding window: compute SMA and StdDev for each window of length `period`
    for (size_t i = 0; i <= data.size() - (size_t)period; ++i) {
        // Compute mean for this window
        double sum = 0.0;
        for (int j = 0; j < period; ++j) sum += data[i + j];
        double mean = sum / period;

        // Compute population standard deviation for this window
        double sq_sum = 0.0;
        for (int j = 0; j < period; ++j) {
            double diff = data[i + j] - mean;
            sq_sum += diff * diff;
        }
        double std_dev = std::sqrt(sq_sum / period);

        middle.push_back(mean);
        upper.push_back(mean + std_dev_mult * std_dev);
        lower.push_back(mean - std_dev_mult * std_dev);
    }

    return py::dict(
        "upper"_a = upper,
        "middle"_a = middle,
        "lower"_a = lower
    );
}

/**
 * Calculates MACD (Moving Average Convergence/Divergence).
 * Returns a Python dict with keys "macd", "signal", "histogram".
 * All three arrays are aligned to the same length (trimmed to valid overlap).
 *
 *   MACD line   = EMA(fast) - EMA(slow)        [length = data.size()]
 *   Signal line = EMA(signal_period) of MACD   [length = data.size()]
 *   Histogram   = MACD line - Signal line
 *
 * The first (slow - 1) MACD values are 0.0 placeholders (insufficient data).
 * The first (slow - 1 + signal_period - 1) signal values are 0.0 placeholders.
 */
py::dict calculate_macd(const std::vector<double>& data, int fast, int slow, int signal_period) {
    if ((int)data.size() < slow) {
        return py::dict(
            "macd"_a = std::vector<double>{},
            "signal"_a = std::vector<double>{},
            "histogram"_a = std::vector<double>{}
        );
    }

    // Compute EMA(fast) and EMA(slow) for full data length
    std::vector<double> ema_fast = calculate_ema(data, fast);
    std::vector<double> ema_slow = calculate_ema(data, slow);

    // MACD line = EMA(fast) - EMA(slow) for each data point
    // The first (slow - 1) points are unreliable; set to 0.0 as placeholders
    std::vector<double> macd_line;
    macd_line.reserve(data.size());
    for (size_t i = 0; i < data.size(); ++i) {
        // EMA seeded from data[0]; values before `slow` warmup are set to 0
        macd_line.push_back((i < (size_t)(slow - 1)) ? 0.0 : ema_fast[i] - ema_slow[i]);
    }

    // Signal line = EMA(signal_period) of the MACD line
    std::vector<double> signal_line = calculate_ema(macd_line, signal_period);

    // Histogram = MACD - Signal
    std::vector<double> histogram;
    histogram.reserve(data.size());
    for (size_t i = 0; i < data.size(); ++i) {
        histogram.push_back(macd_line[i] - signal_line[i]);
    }

    return py::dict(
        "macd"_a = macd_line,
        "signal"_a = signal_line,
        "histogram"_a = histogram
    );
}

// Bind all functions to the Python module
PYBIND11_MODULE(indicators, m) {
    m.doc() = "C++ Financial Indicators Module — SMA, RSI, EMA, Bollinger Bands, MACD";

    m.def("calculate_sma", &calculate_sma,
          "Calculate Simple Moving Average (sliding window, O(n))",
          py::arg("data"), py::arg("period"));

    m.def("calculate_rsi", &calculate_rsi,
          "Calculate Relative Strength Index using Wilder's smoothing",
          py::arg("data"), py::arg("period"));

    m.def("calculate_ema", &calculate_ema,
          "Calculate Exponential Moving Average",
          py::arg("data"), py::arg("period"));

    m.def("calculate_bollinger_bands", &calculate_bollinger_bands,
          "Calculate Bollinger Bands — returns dict with 'upper', 'middle', 'lower'",
          py::arg("data"), py::arg("period") = 20, py::arg("std_dev_mult") = 2.0);

    m.def("calculate_macd", &calculate_macd,
          "Calculate MACD — returns dict with 'macd', 'signal', 'histogram'",
          py::arg("data"), py::arg("fast") = 12, py::arg("slow") = 26, py::arg("signal_period") = 9);
}
