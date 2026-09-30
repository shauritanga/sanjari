import 'package:flutter/material.dart';

/// Labelled text field with inline error. Port of AppTextInput.tsx. When
/// [obscureText] is set, renders a show/hide eye-icon toggle so every
/// password field app-wide gets the same control without per-screen
/// changes.
class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    required this.label,
    required this.controller,
    this.obscureText = false,
    this.keyboardType,
    this.error,
    this.hint,
    this.maxLength,
    this.textInputAction,
    this.onSubmitted,
    this.onChanged,
    this.minLines,
  });

  final String label;
  final TextEditingController controller;
  final bool obscureText;
  final TextInputType? keyboardType;
  final String? error;
  final String? hint;
  final int? maxLength;
  final TextInputAction? textInputAction;
  final void Function(String)? onSubmitted;
  final void Function(String)? onChanged;
  final int? minLines;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    final isPassword = widget.obscureText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 6),
        TextField(
          controller: widget.controller,
          obscureText: isPassword && !_visible,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          onSubmitted: widget.onSubmitted,
          onChanged: widget.onChanged,
          minLines: widget.minLines,
          maxLines: widget.minLines != null ? null : 1,
          decoration: InputDecoration(
            hintText: widget.hint,
            errorText: widget.error?.isEmpty == true ? null : widget.error,
            suffixIcon: isPassword
                ? IconButton(
                    tooltip: _visible ? 'Hide password' : 'Show password',
                    icon: Icon(
                      _visible ? Icons.visibility_off : Icons.visibility,
                    ),
                    onPressed: () => setState(() => _visible = !_visible),
                  )
                : null,
          ),
          maxLength: widget.maxLength,
        ),
      ],
    );
  }
}
