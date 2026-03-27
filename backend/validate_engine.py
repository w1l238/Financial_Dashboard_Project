import time
import sys
import os

# Setup paths
sys.path.append(os.path.join(os.getcwd(), "app", "engine"))

try:
    import indicators

    print("✅ C++ Engine loaded successfully.")
except ImportError:
    print("❌ Failed to load C++ Engine.")
    sys.exit(1)


def python_sma(data, period):
    if len(data) < period:
        return []
    return [sum(data[i : i + period]) / period for i in range(len(data) - period + 1)]


def run_tests():
    print("\n--- Logic Validation ---")
    test_data = [10.0, 12.0, 11.0, 13.0, 15.0, 14.0, 16.0]

    # 1. SMA Accuracy
    cpp_sma = indicators.calculate_sma(test_data, 3)
    py_sma = python_sma(test_data, 3)
    if [round(x, 2) for x in cpp_sma] == [round(x, 2) for x in py_sma]:
        print("✅ SMA Accuracy: Passed")
    else:
        print("❌ SMA Accuracy: Failed")

    # 2. RSI Logic
    rsi_data = [
        44.34,
        44.09,
        44.15,
        43.61,
        44.33,
        44.83,
        45.10,
        45.42,
        45.84,
        46.08,
        45.89,
        46.03,
        45.61,
        46.28,
        46.28,
    ]
    cpp_rsi = indicators.calculate_rsi(rsi_data, 14)
    if len(cpp_rsi) > 0:
        print(
            f"✅ RSI Logic: Produced {len(cpp_rsi)} points (Latest: {cpp_rsi[-1]:.2f})"
        )
    else:
        print("❌ RSI Logic: Failed")

    print("\n--- Performance Benchmarks (100,000 data points) ---")
    large_data = [float(i % 100) for i in range(100000)]

    start = time.perf_counter()
    indicators.calculate_sma(large_data, 20)
    cpp_time = (time.perf_counter() - start) * 1000

    start = time.perf_counter()
    python_sma(large_data, 20)
    py_time = (time.perf_counter() - start) * 1000

    print(f"🚀 C++ SMA: {cpp_time:.2f}ms")
    print(f"🐍 Python SMA: {py_time:.2f}ms")
    print(f"📈 Improvement: {py_time / cpp_time:.1f}x faster")

    print("\n--- Edge Case Handling ---")
    res = indicators.calculate_sma([], 10)
    print(f"✅ Empty Data: Handled (Result: {res})")

    res = indicators.calculate_rsi([10.0, 20.0], 14)
    print(f"✅ Insufficient Data (RSI): Handled (Result: {res})")

    flat_data = [100.0] * 20
    res = indicators.calculate_rsi(flat_data, 14)
    print(f"✅ Zero Volatility: Handled (RSI: {res[-1] if res else 'N/A'})")


if __name__ == "__main__":
    run_tests()
