"""Test script to verify imports work"""
try:
    import main
    print("✓ Successfully imported main")
    print(f"✓ App object: {main.app}")
    print("✓ All imports working correctly!")
except Exception as e:
    print(f"✗ Import error: {e}")
    import traceback
    traceback.print_exc()


