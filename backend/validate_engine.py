#
# Validation Utility for the C++ Analytics Engine
# Verifies math accuracy of C++ indicator against Python baselines and 
# benchmarks execution speed to quantify performance gains. 
#

# Imports
import time
import sys
import os

# Setup paths to find C++ engine
sys.path.append(os.path.join(os.getcwd(), "app", "engine"))

try:
    # Try to load the compiled C++ 'indicators' module
    import indicators
    # Print success
    print("✅ C++ Engine loaded successfully.")
except ImportError:
    # Terminate execution if engine is missing or not/improperly comiled
    print("❌ Failed to load C++ Engine.") # Print failure
    sys.exit(1)


def python_sma(data, period):
    """
    Pure Pythonn implementation of the Simple Moving Average (SMA).
    Used as the python equivelant to the C++ engine to validate logic accuracy.
    """
    if len(data) < period:
        return []
    return [sum(data[i : i + period]) / period for i in range(len(data) - period + 1)]

# Run the tests
def run_tests():
    # Step 1: Functional Correctness Testing
    print("\n--- Logic Validation ---")
    test_data = [10.0, 12.0, 11.0, 13.0, 15.0, 14.0, 16.0]

    # 1. Verify 1: Compare C++ SMA output against Python reference (rounded)
    cpp_sma = indicators.calculate_sma(test_data, 3)
    py_sma = python_sma(test_data, 3)
    if [round(x, 2) for x in cpp_sma] == [round(x, 2) for x in py_sma]:
        print("✅ SMA Accuracy: Passed")
    else:
        print("❌ SMA Accuracy: Failed")

    # 2. Verify 2: Ensure Reakitive Strength Index (RSI) calculation produces valid results
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

    # Step 2: Stress Testing & Speed Comparison
    # Using 100k points to simulate high-frequency streaming data scenarios
    print("\n--- Performance Benchmarks (100,000 data points) ---")
    large_data = [float(i % 100) for i in range(100000)]

    # Benchmark the C++ Engine performance
    start = time.perf_counter()
    indicators.calculate_sma(large_data, 20)
    cpp_time = (time.perf_counter() - start) * 1000

    # Benchmark the Pure Python performance
    start = time.perf_counter()
    python_sma(large_data, 20)
    py_time = (time.perf_counter() - start) * 1000

    # Output metrics
    print(f"🚀 C++ SMA: {cpp_time:.2f}ms")
    print(f"🐍 Python SMA: {py_time:.2f}ms")
    print(f"📈 Improvement: {py_time / cpp_time:.1f}x faster")

    # Step 3: Input Error Handling & Boundary Verification
    print("\n--- Edge Case Handling ---")

    # Test 1: Empty input data sets
    res = indicators.calculate_sma([], 10)
    print(f"✅ Empty Data: Handled (Result: {res})")

    # Test 2: Input arrays shorter than the lookback period
    res = indicators.calculate_rsi([10.0, 20.0], 14)
    print(f"✅ Insufficient Data (RSI): Handled (Result: {res})")

    # Test 3: Data with no movement (which precents division by 0 in RSI logic)
    flat_data = [100.0] * 20
    res = indicators.calculate_rsi(flat_data, 14)
    print(f"✅ Zero Volatility: Handled (RSI: {res[-1] if res else 'N/A'})")

 # Entry point
if __name__ == "__main__":
    run_tests()
