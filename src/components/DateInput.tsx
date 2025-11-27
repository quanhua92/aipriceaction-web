import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateInputProps {
	id?: string
	value: string | undefined
	onChange: (value: string | undefined) => void
	placeholder?: string
	className?: string
	clearable?: boolean
}

/**
 * Date input component that displays YYYY-MM-DD format in a text field.
 * Has a calendar button that opens native date picker.
 */
export function DateInput({
	id,
	value,
	onChange,
	placeholder = 'YYYY-MM-DD',
	className,
	clearable = true,
}: DateInputProps) {
	const dateInputRef = React.useRef<HTMLInputElement>(null)
	const [inputValue, setInputValue] = React.useState(value || '')

	// Sync with external value
	React.useEffect(() => {
		setInputValue(value || '')
	}, [value])

	const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		setInputValue(newValue)

		// Only update parent if valid date or empty
		if (newValue === '') {
			onChange(undefined)
		} else if (/^\d{4}-\d{2}-\d{2}$/.test(newValue)) {
			const date = new Date(newValue)
			if (!isNaN(date.getTime())) {
				onChange(newValue)
			}
		}
	}

	const handleBlur = () => {
		// On blur, reset to last valid value if current input is invalid
		if (inputValue && !/^\d{4}-\d{2}-\d{2}$/.test(inputValue)) {
			setInputValue(value || '')
		}
	}

	const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		if (newValue) {
			setInputValue(newValue)
			onChange(newValue)
		}
	}

	const handleCalendarClick = () => {
		dateInputRef.current?.showPicker()
	}

	const handleClear = () => {
		setInputValue('')
		onChange(undefined)
	}

	return (
		<div className={cn('flex items-center gap-1', className)}>
			<Input
				id={id}
				type="text"
				value={inputValue}
				onChange={handleTextChange}
				onBlur={handleBlur}
				placeholder={placeholder}
				pattern="\d{4}-\d{2}-\d{2}"
				className="w-full font-mono"
			/>
			{/* Hidden native date input */}
			<input
				ref={dateInputRef}
				type="date"
				value={value || ''}
				onChange={handleDatePickerChange}
				className="sr-only"
				tabIndex={-1}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-8 w-8 p-0 flex-shrink-0"
				onClick={handleCalendarClick}
			>
				<Calendar className="h-4 w-4" />
			</Button>
			{clearable && value && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0 flex-shrink-0"
					onClick={handleClear}
				>
					<X className="h-4 w-4" />
				</Button>
			)}
		</div>
	)
}
