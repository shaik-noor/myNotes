// Base 62 characters for fractional indexing
const DIGITS: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

fn get_digit_val(c: u8) -> Option<usize> {
    DIGITS.iter().position(|&d| d == c)
}

pub fn generate_key_between(prev: Option<&str>, next: Option<&str>) -> String {
    match (prev, next) {
        (None, None) => "a0".to_string(),
        (None, Some(next_key)) => {
            if next_key.is_empty() {
                return "a0".to_string();
            }
            // Generate a key strictly smaller than next_key
            let bytes = next_key.as_bytes();
            for i in 0..bytes.len() {
                if let Some(val) = get_digit_val(bytes[i]) {
                    if val > 0 {
                        let mut res = bytes[..i].to_vec();
                        res.push(DIGITS[val / 2]);
                        return String::from_utf8(res).unwrap_or_else(|_| "00".to_string());
                    }
                }
            }
            format!("0{}", next_key)
        }
        (Some(prev_key), None) => {
            if prev_key.is_empty() {
                return "a0".to_string();
            }
            // Generate a key strictly greater than prev_key
            let bytes = prev_key.as_bytes();
            let last_byte = bytes[bytes.len() - 1];
            if let Some(val) = get_digit_val(last_byte) {
                if val + 1 < DIGITS.len() {
                    let mut res = bytes[..bytes.len() - 1].to_vec();
                    res.push(DIGITS[val + 1]);
                    return String::from_utf8(res).unwrap_or_else(|_| format!("{}V", prev_key));
                }
            }
            format!("{}V", prev_key)
        }
        (Some(prev_key), Some(next_key)) => {
            if prev_key >= next_key {
                // Fallback if inputs are invalid or inverted
                return format!("{}V", prev_key);
            }

            let a = prev_key.as_bytes();
            let b = next_key.as_bytes();
            let min_len = a.len().min(b.len());
            let mut prefix_len = 0;

            while prefix_len < min_len && a[prefix_len] == b[prefix_len] {
                prefix_len += 1;
            }

            let mut res = a[..prefix_len].to_vec();
            let a_char = if prefix_len < a.len() {
                get_digit_val(a[prefix_len]).unwrap_or(0)
            } else {
                0
            };
            let b_char = if prefix_len < b.len() {
                get_digit_val(b[prefix_len]).unwrap_or(DIGITS.len() - 1)
            } else {
                DIGITS.len() - 1
            };

            if b_char > a_char + 1 {
                let mid = (a_char + b_char) / 2;
                res.push(DIGITS[mid]);
                String::from_utf8(res).unwrap_or_else(|_| format!("{}V", prev_key))
            } else {
                // If adjacent, append to prev_key
                format!("{}V", prev_key)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fractional_indexing() {
        let first = generate_key_between(None, None);
        assert_eq!(first, "a0");

        let before = generate_key_between(None, Some(&first));
        assert!(before < first);

        let after = generate_key_between(Some(&first), None);
        assert!(after > first);

        let between = generate_key_between(Some(&before), Some(&first));
        assert!(between > before && between < first);
    }
}
